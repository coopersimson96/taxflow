import { prisma } from '@/lib/prisma'
import { shopifyApi } from '@/lib/shopify'
import { BillingStatus, InvoiceStatus } from '@prisma/client'

export interface BillingPlan {
  id: string
  organizationId: string
  recurringChargeId?: string | null
  status: BillingStatus
  baseFee: number
  usageRate: number
  currency: string
  billingStartDate?: Date | null
  billingEndDate?: Date | null
  activatedAt?: Date | null
  cancelledAt?: Date | null
}

export interface UsageMetrics {
  transactionCount: number
  transactionVolume: number
  taxCalculated: number
  usageFee: number
}

export interface ShopSession {
  shop: string
  accessToken: string
}

export class BillingService {
  private readonly BASE_FEE = 49.00
  private readonly USAGE_RATE = 0.005 // 0.5%

  /**
   * Create billing plan and initiate immediate billing after app install
   * No trial period - charge upfront
   */
  async initiateBilling(shop: string, organizationId: string): Promise<string> {
    // Check if billing plan already exists
    const existingPlan = await prisma.billingPlan.findUnique({
      where: { organizationId }
    })

    if (existingPlan?.status === 'ACTIVE') {
      throw new Error('Organization already has active billing')
    }

    // Create or update billing plan record
    const plan = await prisma.billingPlan.upsert({
      where: { organizationId },
      update: {
        status: 'PENDING'
      },
      create: {
        organizationId,
        status: 'PENDING',
        baseFee: this.BASE_FEE,
        usageRate: this.USAGE_RATE
      }
    })

    // Create Shopify recurring charge
    const charge = await this.createRecurringCharge(shop, plan)

    // Update plan with charge ID
    await prisma.billingPlan.update({
      where: { id: plan.id },
      data: { 
        recurringChargeId: charge.appSubscription.id 
      }
    })

    // Return confirmation URL for immediate redirect
    return charge.confirmationUrl
  }

  /**
   * Create recurring application charge in Shopify
   */
  private async createRecurringCharge(shop: string, plan: BillingPlan) {
    const session = await this.getShopSession(shop)
    const client = new shopifyApi.clients.Graphql({ session })

    const mutation = `
      mutation appSubscriptionCreate($name: String!, $returnUrl: URL!, $test: Boolean!, $lineItems: [AppSubscriptionLineItemInput!]!) {
        appSubscriptionCreate(
          name: $name
          returnUrl: $returnUrl
          test: $test
          lineItems: $lineItems
        ) {
          appSubscription {
            id
            name
            status
            currentPeriodEnd
          }
          confirmationUrl
          userErrors {
            field
            message
          }
        }
      }
    `

    const variables = {
      name: "TaxFlow - Tax Automation for Shopify",
      returnUrl: `${process.env.APP_URL}/api/shopify/billing/callback`,
      test: process.env.NODE_ENV !== 'production',
      lineItems: [{
        plan: {
          appRecurringPricingDetails: {
            interval: "EVERY_30_DAYS",
            price: {
              amount: plan.baseFee,
              currencyCode: plan.currency
            }
          }
        }
      }]
    }

    const response = await client.query({ 
      data: { query: mutation, variables } 
    })

    const result = response.body.data.appSubscriptionCreate

    if (result.userErrors.length > 0) {
      throw new Error(`Billing charge creation failed: ${result.userErrors[0].message}`)
    }

    return result
  }

  /**
   * Verify and activate billing after charge confirmation
   */
  async activateBilling(shop: string, chargeId: string): Promise<BillingPlan> {
    // Verify charge status with Shopify
    const charge = await this.getCharge(shop, chargeId)

    if (charge.status !== 'ACTIVE') {
      throw new Error(`Charge not active. Status: ${charge.status}`)
    }

    // Find and activate billing plan
    const plan = await prisma.billingPlan.findUnique({
      where: { recurringChargeId: chargeId }
    })

    if (!plan) {
      throw new Error('Billing plan not found for charge ID')
    }

    const now = new Date()
    const billingEndDate = new Date(now)
    billingEndDate.setMonth(billingEndDate.getMonth() + 1)

    return prisma.billingPlan.update({
      where: { id: plan.id },
      data: {
        status: 'ACTIVE',
        activatedAt: now,
        billingStartDate: now,
        billingEndDate
      }
    })
  }

  /**
   * Get charge details from Shopify
   */
  private async getCharge(shop: string, chargeId: string) {
    const session = await this.getShopSession(shop)
    const client = new shopifyApi.clients.Graphql({ session })

    const query = `
      query appSubscription($id: ID!) {
        appSubscription(id: $id) {
          id
          name
          status
          currentPeriodEnd
          createdAt
        }
      }
    `

    const response = await client.query({
      data: { 
        query, 
        variables: { id: chargeId } 
      }
    })

    return response.body.data.appSubscription
  }

  /**
   * Calculate usage for a billing period
   */
  async calculateUsageForPeriod(
    organizationId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<UsageMetrics> {
    // Get all transactions for the period
    const transactions = await prisma.transaction.aggregate({
      where: {
        organizationId,
        transactionDate: {
          gte: startDate,
          lte: endDate
        },
        type: 'SALE' // Only count sales, not refunds
      },
      _sum: {
        subtotal: true,
        totalTax: true
      },
      _count: true
    })

    const volume = (transactions._sum.subtotal || 0) / 100 // Convert from cents
    const usageFee = volume * this.USAGE_RATE // 0.5%
    const taxCalculated = (transactions._sum.totalTax || 0) / 100 // Convert from cents

    return {
      transactionCount: transactions._count,
      transactionVolume: volume,
      taxCalculated,
      usageFee
    }
  }

  /**
   * Create usage charge in Shopify for additional fees
   */
  async createUsageCharge(
    shop: string,
    recurringChargeId: string,
    amount: number,
    description: string
  ) {
    const session = await this.getShopSession(shop)
    const client = new shopifyApi.clients.Graphql({ session })

    const mutation = `
      mutation appUsageRecordCreate($subscriptionLineItemId: ID!, $price: MoneyInput!, $description: String!) {
        appUsageRecordCreate(
          subscriptionLineItemId: $subscriptionLineItemId
          price: $price
          description: $description
        ) {
          appUsageRecord {
            id
            description
            price {
              amount
              currencyCode
            }
            createdAt
          }
          userErrors {
            field
            message
          }
        }
      }
    `

    const response = await client.query({
      data: {
        query: mutation,
        variables: {
          subscriptionLineItemId: recurringChargeId,
          price: {
            amount: amount,
            currencyCode: "USD"
          },
          description
        }
      }
    })

    const result = response.body.data.appUsageRecordCreate

    if (result.userErrors.length > 0) {
      throw new Error(`Usage charge failed: ${result.userErrors[0].message}`)
    }

    return result.appUsageRecord
  }

  /**
   * Calculate and charge usage fee at end of billing period
   */
  async calculateAndChargeUsage(plan: BillingPlan): Promise<any> {
    if (!plan.billingStartDate || !plan.billingEndDate) {
      throw new Error('Billing period not set')
    }

    const usage = await this.calculateUsageForPeriod(
      plan.organizationId,
      plan.billingStartDate,
      plan.billingEndDate
    )

    // Create usage record
    await prisma.usageRecord.create({
      data: {
        billingPlanId: plan.id,
        periodStart: plan.billingStartDate,
        periodEnd: plan.billingEndDate,
        ...usage
      }
    })

    // Create usage charge if there's volume
    let invoice
    if (usage.usageFee > 0) {
      const shop = await this.getShopForPlan(plan.id)
      
      const usageCharge = await this.createUsageCharge(
        shop,
        plan.recurringChargeId!,
        usage.usageFee,
        `Usage fee: 0.5% of $${usage.transactionVolume.toFixed(2)} in sales`
      )

      // Create invoice
      invoice = await prisma.invoice.create({
        data: {
          billingPlanId: plan.id,
          periodStart: plan.billingStartDate,
          periodEnd: plan.billingEndDate,
          baseFee: plan.baseFee,
          usageFee: usage.usageFee,
          totalAmount: plan.baseFee + usage.usageFee,
          shopifyUsageChargeId: usageCharge.id,
          status: 'PAID',
          paidAt: new Date()
        }
      })
    } else {
      // No usage fee, just base fee
      invoice = await prisma.invoice.create({
        data: {
          billingPlanId: plan.id,
          periodStart: plan.billingStartDate,
          periodEnd: plan.billingEndDate,
          baseFee: plan.baseFee,
          usageFee: 0,
          totalAmount: plan.baseFee,
          status: 'PAID',
          paidAt: new Date()
        }
      })
    }

    return invoice
  }

  /**
   * Get current usage for an organization
   */
  async getCurrentUsage(organizationId: string): Promise<UsageMetrics | null> {
    const plan = await prisma.billingPlan.findUnique({
      where: { organizationId }
    })

    if (!plan || plan.status !== 'ACTIVE' || !plan.billingStartDate || !plan.billingEndDate) {
      return null
    }

    return this.calculateUsageForPeriod(
      organizationId,
      plan.billingStartDate,
      plan.billingEndDate
    )
  }

  /**
   * Get active billing plan for organization
   */
  async getActivePlan(organizationId: string): Promise<BillingPlan | null> {
    return prisma.billingPlan.findUnique({
      where: { organizationId }
    })
  }

  /**
   * Cancel billing subscription
   */
  async cancelBilling(organizationId: string): Promise<void> {
    await prisma.billingPlan.update({
      where: { organizationId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date()
      }
    })
  }

  /**
   * Helper to get shop domain for a billing plan
   */
  private async getShopForPlan(billingPlanId: string): Promise<string> {
    const plan = await prisma.billingPlan.findUnique({
      where: { id: billingPlanId },
      include: {
        organization: {
          include: {
            integrations: {
              where: { type: 'SHOPIFY' },
              take: 1
            }
          }
        }
      }
    })

    if (!plan?.organization.integrations[0]) {
      throw new Error('No Shopify integration found for billing plan')
    }

    const credentials = plan.organization.integrations[0].credentials as any
    return credentials.shop
  }

  /**
   * Helper to get Shopify session for shop
   */
  private async getShopSession(shop: string): Promise<ShopSession> {
    const integration = await prisma.integration.findFirst({
      where: {
        type: 'SHOPIFY',
        config: {
          path: ['shop'],
          equals: shop
        }
      }
    })

    if (!integration) {
      throw new Error(`No integration found for shop: ${shop}`)
    }

    const credentials = integration.credentials as any
    return {
      shop,
      accessToken: credentials.accessToken
    }
  }

  /**
   * Format currency for display
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount)
  }
}

export const billingService = new BillingService()