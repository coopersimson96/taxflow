/**
 * Shopify Payout Calculator
 * Calculates estimated payouts from orders without needing payment API access
 */

import { withWebhookDb } from '@/lib/prisma'
import { ShopifyOrder } from '@/types/shopify'

interface PayoutCalculation {
  payoutDate: string
  orders: ShopifyOrder[]
  grossSales: number
  fees: number
  refunds: number
  netPayout: number
  taxToSetAside: number
}

interface ShopifyPlan {
  name: 'basic' | 'shopify' | 'advanced' | 'plus'
  transactionFeePercent: number
  transactionFeeCents: number
}

export class ShopifyPayoutCalculator {
  private static readonly PLANS: Record<string, ShopifyPlan> = {
    basic: { name: 'basic', transactionFeePercent: 0.029, transactionFeeCents: 30 },
    shopify: { name: 'shopify', transactionFeePercent: 0.026, transactionFeeCents: 30 },
    advanced: { name: 'advanced', transactionFeePercent: 0.024, transactionFeeCents: 30 },
    plus: { name: 'plus', transactionFeePercent: 0.023, transactionFeeCents: 30 }
  }

  /**
   * Calculate when an order will be paid out based on Shopify's schedule
   * Standard schedule: 2 business days after order
   */
  static calculatePayoutDate(orderDate: Date): Date {
    const payout = new Date(orderDate)
    let daysToAdd = 2 // Standard 2 business days

    // Adjust for weekends
    const dayOfWeek = orderDate.getDay()
    
    if (dayOfWeek === 5) { // Friday
      daysToAdd = 4 // Paid on Tuesday
    } else if (dayOfWeek === 6) { // Saturday
      daysToAdd = 3 // Paid on Tuesday
    } else if (dayOfWeek === 0) { // Sunday
      daysToAdd = 2 // Paid on Tuesday
    } else if (dayOfWeek === 3 || dayOfWeek === 4) { // Wed or Thu
      daysToAdd = 2 // Standard 2 days
    }

    payout.setDate(payout.getDate() + daysToAdd)
    return payout
  }

  /**
   * Calculate transaction fees based on plan and order amount
   */
  static calculateFees(orderAmount: number, plan: ShopifyPlan): number {
    const percentageFee = orderAmount * plan.transactionFeePercent
    const fixedFee = plan.transactionFeeCents / 100
    return Number((percentageFee + fixedFee).toFixed(2))
  }

  /**
   * Detect Shopify plan from shop data or use stored preference
   */
  static async detectShopifyPlan(shopDomain: string): Promise<ShopifyPlan> {
    // First check if we have a stored plan preference
    const integration = await withWebhookDb(async (db) => {
      return await db.integration.findFirst({
        where: {
          type: 'SHOPIFY',
          credentials: {
            path: ['shop'],
            equals: shopDomain
          }
        }
      })
    })

    // Check metadata for stored plan
    const metadata = integration?.metadata as any
    if (metadata?.shopifyPlan) {
      return this.PLANS[metadata.shopifyPlan] || this.PLANS.shopify
    }

    // Default to Shopify plan (most common)
    // In the future, we can add logic to detect based on features
    return this.PLANS.shopify
  }

  /**
   * Group orders by their expected payout date
   */
  static groupOrdersByPayoutDate(orders: ShopifyOrder[]): Map<string, ShopifyOrder[]> {
    const grouped = new Map<string, ShopifyOrder[]>()

    orders.forEach(order => {
      const orderDate = new Date(order.created_at)
      const payoutDate = this.calculatePayoutDate(orderDate)
      const payoutKey = payoutDate.toISOString().split('T')[0]

      if (!grouped.has(payoutKey)) {
        grouped.set(payoutKey, [])
      }
      grouped.get(payoutKey)!.push(order)
    })

    return grouped
  }

  /**
   * Calculate estimated payouts for a date range
   */
  static async calculatePayouts(
    shopDomain: string,
    orders: ShopifyOrder[],
    taxRate: number = 0.30 // Default 30% tax rate
  ): Promise<PayoutCalculation[]> {
    const plan = await this.detectShopifyPlan(shopDomain)
    const groupedOrders = this.groupOrdersByPayoutDate(orders)
    const calculations: PayoutCalculation[] = []

    for (const [payoutDate, payoutOrders] of groupedOrders) {
      let grossSales = 0
      let totalFees = 0
      let totalRefunds = 0

      payoutOrders.forEach(order => {
        const orderAmount = parseFloat(order.total_price)
        grossSales += orderAmount

        // Calculate fees for this order
        const fees = this.calculateFees(orderAmount, plan)
        totalFees += fees

        // Add refunds if any
        if (order.refunds && order.refunds.length > 0) {
          order.refunds.forEach(refund => {
            refund.refund_line_items.forEach(item => {
              totalRefunds += parseFloat(item.subtotal)
            })
          })
        }
      })

      const netPayout = grossSales - totalFees - totalRefunds
      const taxToSetAside = netPayout * taxRate

      calculations.push({
        payoutDate,
        orders: payoutOrders,
        grossSales: Number(grossSales.toFixed(2)),
        fees: Number(totalFees.toFixed(2)),
        refunds: Number(totalRefunds.toFixed(2)),
        netPayout: Number(netPayout.toFixed(2)),
        taxToSetAside: Number(taxToSetAside.toFixed(2))
      })
    }

    return calculations.sort((a, b) => 
      new Date(a.payoutDate).getTime() - new Date(b.payoutDate).getTime()
    )
  }

  /**
   * Store plan preference for a shop
   */
  static async updateShopPlan(
    integrationId: string, 
    plan: 'basic' | 'shopify' | 'advanced' | 'plus'
  ): Promise<void> {
    await withWebhookDb(async (db) => {
      const integration = await db.integration.findUnique({
        where: { id: integrationId }
      })

      if (!integration) throw new Error('Integration not found')

      const metadata = (integration.metadata as any) || {}
      metadata.shopifyPlan = plan

      await db.integration.update({
        where: { id: integrationId },
        data: { metadata }
      })
    })
  }
}