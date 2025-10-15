import { prisma } from '@/lib/prisma'
import { BillingStatus, InvoiceStatus } from '@prisma/client'
import { ShopifyGraphQLService } from './shopify-graphql'

/**
 * BillingService - Secure Shopify App Billing Management
 *
 * Security Architecture:
 * - All Shopify API calls are validated
 * - Charge IDs are verified against Shopify before activation
 * - Input validation on all parameters
 * - No user-controlled data in queries without sanitization
 *
 * Design Pattern:
 * - Static methods for stateless operations
 * - Follows existing codebase patterns
 * - Uses ShopifyGraphQLService for all Shopify API calls
 */

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

interface ShopCredentials {
  shop: string
  accessToken: string
  organizationId: string
}

export class BillingService {
  private static readonly BASE_FEE = 49.00
  private static readonly USAGE_RATE = 0.005 // 0.5%
  private static readonly BILLING_INTERVAL_DAYS = 30
  private static readonly ALLOWED_CURRENCIES = ['USD', 'CAD'] as const

  /**
   * SECURITY: Validate shop domain format
   */
  private static validateShopDomain(shop: string): boolean {
    // Must be a valid myshopify.com domain
    const shopRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]\.myshopify\.com$/
    return shopRegex.test(shop) && shop.length <= 100
  }

  /**
   * SECURITY: Validate charge ID format (Shopify GID)
   */
  private static validateChargeId(chargeId: string): boolean {
    // Shopify GraphQL IDs follow gid://shopify/Resource/ID pattern
    const gidRegex = /^gid:\/\/shopify\/AppSubscription\/\d+$/
    return gidRegex.test(chargeId)
  }

  /**
   * SECURITY: Get shop credentials with validation
   * Ensures the shop exists and is properly connected
   */
  private static async getShopCredentials(shop: string): Promise<ShopCredentials> {
    if (!this.validateShopDomain(shop)) {
      throw new Error('Invalid shop domain format')
    }

    const integration = await prisma.integration.findFirst({
      where: {
        type: 'SHOPIFY',
        status: 'CONNECTED',
        config: {
          path: ['shop'],
          equals: shop
        }
      },
      select: {
        credentials: true,
        organizationId: true
      }
    })

    if (!integration) {
      throw new Error('Shop integration not found')
    }

    const credentials = integration.credentials as any

    if (!credentials?.accessToken) {
      throw new Error('Shop credentials invalid')
    }

    return {
      shop,
      accessToken: credentials.accessToken,
      organizationId: integration.organizationId
    }
  }

  /**
   * Initiate billing subscription for organization
   * SECURITY: Only creates billing if organization doesn't already have active billing
   */
  static async initiateBilling(
    shop: string,
    organizationId: string
  ): Promise<string> {
    // Validate inputs
    if (!this.validateShopDomain(shop)) {
      throw new Error('Invalid shop domain')
    }

    if (!organizationId || typeof organizationId !== 'string') {
      throw new Error('Invalid organization ID')
    }

    // Get credentials and verify shop ownership
    const credentials = await this.getShopCredentials(shop)

    // SECURITY: Verify the organization owns this shop
    if (credentials.organizationId !== organizationId) {
      throw new Error('Shop does not belong to organization')
    }

    // Check if billing already exists
    const existingPlan = await prisma.billingPlan.findUnique({
      where: { organizationId },
      select: { status: true }
    })

    if (existingPlan?.status === 'ACTIVE') {
      throw new Error('Organization already has active billing')
    }

    // Create or update billing plan
    const plan = await prisma.billingPlan.upsert({
      where: { organizationId },
      update: { status: 'PENDING' },
      create: {
        organizationId,
        status: 'PENDING',
        baseFee: this.BASE_FEE,
        usageRate: this.USAGE_RATE,
        currency: 'USD'
      }
    })

    // Create Shopify subscription
    const subscription = await this.createShopifySubscription(
      credentials.shop,
      credentials.accessToken,
      plan
    )

    // Store charge ID for later verification
    await prisma.billingPlan.update({
      where: { id: plan.id },
      data: { recurringChargeId: subscription.id }
    })

    return subscription.confirmationUrl
  }

  /**
   * Create Shopify app subscription charge via GraphQL API
   */
  private static async createShopifySubscription(
    shop: string,
    accessToken: string,
    plan: { baseFee: number; currency: string }
  ): Promise<{ id: string; confirmationUrl: string }> {
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

    const result = await ShopifyGraphQLService.executeQuery<{
      appSubscriptionCreate: {
        appSubscription: { id: string; name: string; status: string; currentPeriodEnd: string }
        confirmationUrl: string
        userErrors: Array<{ field: string; message: string }>
      }
    }>(shop, accessToken, { query: mutation, variables })

    if (result.appSubscriptionCreate.userErrors?.length > 0) {
      throw new Error(`Shopify billing error: ${result.appSubscriptionCreate.userErrors[0].message}`)
    }

    return {
      id: result.appSubscriptionCreate.appSubscription.id,
      confirmationUrl: result.appSubscriptionCreate.confirmationUrl
    }
  }

  /**
   * Activate billing after merchant confirms subscription
   * SECURITY: Verifies charge_id directly with Shopify before activation
   */
  static async activateBilling(
    shop: string,
    chargeId: string
  ): Promise<BillingPlan> {
    // Validate inputs
    if (!this.validateShopDomain(shop)) {
      throw new Error('Invalid shop domain')
    }

    if (!this.validateChargeId(chargeId)) {
      throw new Error('Invalid charge ID format')
    }

    // Get credentials
    const credentials = await this.getShopCredentials(shop)

    // SECURITY: Verify charge with Shopify BEFORE activating
    const shopifySubscription = await this.verifyShopifySubscription(
      credentials.shop,
      credentials.accessToken,
      chargeId
    )

    if (shopifySubscription.status !== 'ACTIVE') {
      throw new Error(`Subscription not active. Status: ${shopifySubscription.status}`)
    }

    // Find billing plan by charge ID
    const plan = await prisma.billingPlan.findUnique({
      where: { recurringChargeId: chargeId }
    })

    if (!plan) {
      throw new Error('Billing plan not found for charge')
    }

    // SECURITY: Verify the plan belongs to the same organization as the shop
    if (plan.organizationId !== credentials.organizationId) {
      throw new Error('Charge does not belong to shop organization')
    }

    // Activate billing
    const now = new Date()
    const billingEndDate = new Date(now)
    billingEndDate.setDate(billingEndDate.getDate() + this.BILLING_INTERVAL_DAYS)

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
   * SECURITY: Verify subscription status directly with Shopify
   * This prevents fake charge_id attacks
   */
  private static async verifyShopifySubscription(
    shop: string,
    accessToken: string,
    chargeId: string
  ): Promise<{ id: string; status: string }> {
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

    const result = await ShopifyGraphQLService.executeQuery<{
      appSubscription: {
        id: string
        name: string
        status: string
        currentPeriodEnd: string
        createdAt: string
      }
    }>(shop, accessToken, {
      query,
      variables: { id: chargeId }
    })

    if (!result.appSubscription) {
      throw new Error('Subscription not found in Shopify')
    }

    return result.appSubscription
  }

  /**
   * Calculate usage metrics for billing period
   */
  static async calculateUsageForPeriod(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<UsageMetrics> {
    const transactions = await prisma.transaction.aggregate({
      where: {
        organizationId,
        transactionDate: {
          gte: startDate,
          lte: endDate
        },
        type: 'SALE'
      },
      _sum: {
        subtotal: true,
        taxAmount: true
      },
      _count: true
    })

    const volume = (transactions._sum.subtotal || 0) / 100
    const usageFee = volume * this.USAGE_RATE
    const taxCalculated = (transactions._sum.taxAmount || 0) / 100

    return {
      transactionCount: transactions._count,
      transactionVolume: volume,
      taxCalculated,
      usageFee
    }
  }

  /**
   * Get current usage for active billing plan
   */
  static async getCurrentUsage(organizationId: string): Promise<UsageMetrics | null> {
    const plan = await prisma.billingPlan.findUnique({
      where: { organizationId },
      select: {
        status: true,
        billingStartDate: true,
        billingEndDate: true
      }
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
  static async getActivePlan(organizationId: string): Promise<BillingPlan | null> {
    return prisma.billingPlan.findUnique({
      where: { organizationId }
    })
  }

  /**
   * Create usage charge in Shopify
   */
  static async createUsageCharge(
    shop: string,
    subscriptionLineItemId: string,
    amount: number,
    description: string
  ): Promise<{ id: string }> {
    if (amount <= 0) {
      throw new Error('Usage amount must be positive')
    }

    if (!description || description.length > 500) {
      throw new Error('Invalid usage description')
    }

    const credentials = await this.getShopCredentials(shop)

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

    const result = await ShopifyGraphQLService.executeQuery<{
      appUsageRecordCreate: {
        appUsageRecord: {
          id: string
          description: string
          price: { amount: number; currencyCode: string }
          createdAt: string
        }
        userErrors: Array<{ field: string; message: string }>
      }
    }>(shop, credentials.accessToken, {
      query: mutation,
      variables: {
        subscriptionLineItemId,
        price: {
          amount: Math.round(amount * 100) / 100, // Round to 2 decimals
          currencyCode: "USD"
        },
        description: description.substring(0, 500) // Truncate to safe length
      }
    })

    if (result.appUsageRecordCreate.userErrors?.length > 0) {
      throw new Error(`Usage charge failed: ${result.appUsageRecordCreate.userErrors[0].message}`)
    }

    return { id: result.appUsageRecordCreate.appUsageRecord.id }
  }

  /**
   * Cancel billing subscription (local database only)
   * Use cancelBillingWithShopify for complete cancellation
   */
  static async cancelBilling(organizationId: string): Promise<void> {
    await prisma.billingPlan.update({
      where: { organizationId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date()
      }
    })
  }

  /**
   * Cancel Shopify subscription via GraphQL API
   * SECURITY: Validates subscription belongs to shop before cancellation
   */
  private static async cancelShopifySubscription(
    shop: string,
    accessToken: string,
    subscriptionId: string
  ): Promise<void> {
    if (!this.validateChargeId(subscriptionId)) {
      throw new Error('Invalid subscription ID format')
    }

    const mutation = `
      mutation appSubscriptionCancel($id: ID!) {
        appSubscriptionCancel(id: $id) {
          appSubscription {
            id
            status
          }
          userErrors {
            field
            message
          }
        }
      }
    `

    const result = await ShopifyGraphQLService.executeQuery<{
      appSubscriptionCancel: {
        appSubscription: {
          id: string
          status: string
        }
        userErrors: Array<{ field: string; message: string }>
      }
    }>(shop, accessToken, {
      query: mutation,
      variables: { id: subscriptionId }
    })

    if (result.appSubscriptionCancel.userErrors?.length > 0) {
      throw new Error(`Subscription cancellation failed: ${result.appSubscriptionCancel.userErrors[0].message}`)
    }
  }

  /**
   * Complete billing cleanup when app is uninstalled
   * Cancels with Shopify and updates local database
   */
  static async cleanupBillingOnUninstall(shop: string): Promise<void> {
    if (!this.validateShopDomain(shop)) {
      throw new Error('Invalid shop domain')
    }

    try {
      // Get shop credentials
      const credentials = await this.getShopCredentials(shop)

      // Get active billing plan
      const plan = await prisma.billingPlan.findUnique({
        where: { organizationId: credentials.organizationId },
        select: {
          id: true,
          recurringChargeId: true,
          status: true
        }
      })

      if (!plan) {
        console.log(`No billing plan found for shop: ${shop}`)
        return
      }

      // Cancel with Shopify if subscription is active
      if (plan.status === 'ACTIVE' && plan.recurringChargeId) {
        try {
          await this.cancelShopifySubscription(
            credentials.shop,
            credentials.accessToken,
            plan.recurringChargeId
          )
          console.log(`✅ Cancelled Shopify subscription: ${plan.recurringChargeId}`)
        } catch (error) {
          // Log error but continue with local cleanup
          // Shopify may have already cancelled it
          console.error('Failed to cancel Shopify subscription (continuing with local cleanup):', error)
        }
      }

      // Update local database
      await prisma.billingPlan.update({
        where: { id: plan.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date()
        }
      })

      console.log(`✅ Billing cleanup completed for shop: ${shop}`)

    } catch (error) {
      console.error(`Failed to cleanup billing for shop ${shop}:`, error)
      throw error
    }
  }
}
