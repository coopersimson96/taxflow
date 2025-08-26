import { ShopifyPayoutCalculator } from '@/lib/services/shopify-payout-calculator'
import { ShopifyService } from '@/lib/services/shopify-service'
import { SHOPIFY_CONFIG, TAX_CONFIG } from '@/lib/config/constants'

/**
 * Calculate estimated payouts from orders when payout API is not available
 */
export async function calculateEstimatedPayouts(
  integration: any,
  startDate: Date,
  endDate: Date
): Promise<any> {
  try {
    const credentials = integration.credentials as any
    const accessToken = credentials.accessToken
    const shopDomain = credentials.shop

    if (!shopDomain || !accessToken) {
      console.log('❌ Missing shop credentials')
      return null
    }

    // Fetch orders for the date range (including 3 days before for payout calculation)
    const adjustedStartDate = new Date(startDate)
    adjustedStartDate.setDate(adjustedStartDate.getDate() - 3)

    // Get paid orders only
    const ordersResponse = await ShopifyService.makeApiRequest(
      shopDomain,
      accessToken,
      `orders.json?status=any&financial_status=paid&created_at_min=${adjustedStartDate.toISOString()}&created_at_max=${endDate.toISOString()}&limit=${SHOPIFY_CONFIG.MAX_ORDERS_PER_REQUEST}`
    )

    if (!ordersResponse.orders || ordersResponse.orders.length === 0) {
      console.log('📦 No paid orders found for payout calculation')
      return null
    }

    console.log(`📦 Found ${ordersResponse.orders.length} paid orders for payout calculation`)

    // Calculate payouts using our estimation engine
    const payoutCalculations = await ShopifyPayoutCalculator.calculatePayouts(
      shopDomain,
      ordersResponse.orders,
      TAX_CONFIG.DEFAULT_TAX_RATE
    )

    // Find today's payout
    const today = new Date().toISOString().split('T')[0]
    const todaysPayout = payoutCalculations.find(calc => calc.payoutDate === today)

    if (todaysPayout) {
      console.log('💰 Calculated today\'s payout:', {
        date: todaysPayout.payoutDate,
        amount: todaysPayout.netPayout,
        orders: todaysPayout.orders.length,
        fees: todaysPayout.fees
      })

      return {
        id: `estimated_${today}`,
        amount: todaysPayout.netPayout.toString(),
        date: todaysPayout.payoutDate,
        status: 'estimated',
        metadata: {
          orders_count: todaysPayout.orders.length,
          gross_sales: todaysPayout.grossSales,
          fees: todaysPayout.fees,
          refunds: todaysPayout.refunds
        }
      }
    }

    // Return the most recent payout calculation
    const mostRecent = payoutCalculations[payoutCalculations.length - 1]
    if (mostRecent) {
      return {
        id: `estimated_${mostRecent.payoutDate}`,
        amount: mostRecent.netPayout.toString(),
        date: mostRecent.payoutDate,
        status: 'estimated',
        metadata: {
          orders_count: mostRecent.orders.length,
          gross_sales: mostRecent.grossSales,
          fees: mostRecent.fees,
          refunds: mostRecent.refunds
        }
      }
    }

    return null
  } catch (error) {
    console.error('❌ Error calculating estimated payouts:', error)
    return null
  }
}