import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { withWebhookDb } from '@/lib/prisma'
import { getStoreTimezone, getStoreDayRange } from '@/lib/utils/timezone'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { integrationId, targetDate } = await request.json()

    if (!integrationId) {
      return NextResponse.json({ error: 'Integration ID required' }, { status: 400 })
    }

    // Get integration
    const integration = await withWebhookDb(async (db) => {
      return await db.integration.findUnique({
        where: { id: integrationId },
        include: {
          organization: {
            include: {
              members: {
                where: {
                  user: {
                    email: session.user.email!
                  }
                }
              }
            }
          }
        }
      })
    })

    if (!integration || integration.organization.members.length === 0) {
      return NextResponse.json({ error: 'Integration not found or access denied' }, { status: 404 })
    }

    // Get credentials
    const credentials = integration.credentials as any
    if (!credentials?.accessToken) {
      return NextResponse.json({ error: 'No access token found' }, { status: 400 })
    }

    const accessToken = credentials.accessToken
    const shopDomain = credentials.shopInfo?.myshopify_domain || credentials.shopInfo?.domain

    if (!shopDomain) {
      return NextResponse.json({ error: 'Shop domain not found' }, { status: 400 })
    }

    // Default to August 15, 2025 if no date specified
    const compareDate = targetDate ? new Date(targetDate) : new Date('2025-08-15')
    
    // Get store timezone
    const storeTimezone = getStoreTimezone(integration)
    console.log('🌍 Store timezone:', storeTimezone)
    console.log('🔍 Integration credentials:', {
      hasCredentials: !!integration.credentials,
      hasShopInfo: !!integration.credentials?.shopInfo,
      shopInfoKeys: integration.credentials?.shopInfo ? Object.keys(integration.credentials.shopInfo) : [],
      timezone: integration.credentials?.shopInfo?.timezone
    })
    
    // Calculate date range for the target date in store timezone
    const dateRange = getStoreDayRange(compareDate, storeTimezone)
    
    // Fetch orders from Shopify for that specific day
    const requestUrl = `https://${shopDomain}/admin/api/2024-01/orders.json?status=any&created_at_min=${dateRange.startUTC.toISOString()}&created_at_max=${dateRange.endUTC.toISOString()}&limit=250`
    
    console.log('🌐 Fetching Shopify orders from:', requestUrl)
    
    const fetchResponse = await fetch(requestUrl, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    })

    if (!fetchResponse.ok) {
      const errorText = await fetchResponse.text()
      return NextResponse.json({ 
        error: 'Shopify API error', 
        status: fetchResponse.status,
        details: errorText 
      }, { status: 500 })
    }

    const shopifyData = await fetchResponse.json()
    const orders = shopifyData.orders || []

    // Filter orders by financial status
    const paidOrders = orders.filter((order: any) => order.financial_status === 'paid')
    const partiallyPaidOrders = orders.filter((order: any) => order.financial_status === 'partially_paid')
    const authorizedOrders = orders.filter((order: any) => order.financial_status === 'authorized')
    const pendingOrders = orders.filter((order: any) => order.financial_status === 'pending')
    const refundedOrders = orders.filter((order: any) => order.financial_status === 'refunded' || order.financial_status === 'partially_refunded')
    const cancelledOrders = orders.filter((order: any) => order.cancelled_at !== null)

    // Calculate totals for different order sets
    const calculateTotals = (orderSet: any[]) => ({
      total_price: orderSet.reduce((sum: number, order: any) => sum + parseFloat(order.total_price || '0'), 0),
      current_total_price: orderSet.reduce((sum: number, order: any) => sum + parseFloat(order.current_total_price || '0'), 0),
      subtotal_price: orderSet.reduce((sum: number, order: any) => sum + parseFloat(order.subtotal_price || '0'), 0),
      total_tax: orderSet.reduce((sum: number, order: any) => sum + parseFloat(order.total_tax || '0'), 0),
      net_sales: orderSet.reduce((sum: number, order: any) => {
        const refunds = order.refunds?.reduce((refundSum: number, refund: any) => 
          refundSum + refund.transactions?.reduce((txSum: number, tx: any) => 
            tx.kind === 'refund' ? txSum + parseFloat(tx.amount || '0') : txSum, 0), 0) || 0
        return sum + parseFloat(order.current_total_price || order.total_price || '0') - refunds
      }, 0)
    })

    // Analyze the different price fields available
    const analysis = {
      totalOrders: orders.length,
      dateRange: {
        start: dateRange.startUTC.toISOString(),
        end: dateRange.endUTC.toISOString(),
        startLocal: dateRange.startLocal.toISOString(),
        endLocal: dateRange.endLocal.toISOString(),
        timezone: storeTimezone
      },
      orderStatusBreakdown: {
        all: orders.length,
        paid: paidOrders.length,
        partially_paid: partiallyPaidOrders.length,
        authorized: authorizedOrders.length,
        pending: pendingOrders.length,
        refunded: refundedOrders.length,
        cancelled: cancelledOrders.length
      },
      priceFieldAnalysis: {
        all_orders: calculateTotals(orders),
        paid_only: calculateTotals(paidOrders),
        paid_and_partially_paid: calculateTotals([...paidOrders, ...partiallyPaidOrders]),
        excluding_cancelled: calculateTotals(orders.filter((o: any) => !o.cancelled_at)),
        excluding_refunded: calculateTotals(orders.filter((o: any) => o.financial_status !== 'refunded'))
      },
      sampleOrders: orders.slice(0, 5).map((order: any) => ({
        id: order.id,
        name: order.name,
        order_number: order.order_number,
        created_at: order.created_at,
        financial_status: order.financial_status,
        fulfillment_status: order.fulfillment_status,
        currency: order.currency,
        total_price: order.total_price,
        current_total_price: order.current_total_price,
        subtotal_price: order.subtotal_price,
        total_tax: order.total_tax,
        total_discounts: order.total_discounts,
        cancelled_at: order.cancelled_at,
        available_fields: Object.keys(order).filter(key => key.includes('price') || key.includes('total') || key.includes('tax'))
      })),
      recommendations: [
        'Compare total_price vs current_total_price',
        'Check if cancelled orders are included',
        'Verify financial_status filtering',
        'Consider refunds and adjustments'
      ]
    }

    return NextResponse.json({
      success: true,
      analysis,
      shopifyResponse: {
        orderCount: orders.length,
        hasOrders: orders.length > 0
      }
    })

  } catch (error) {
    console.error('Debug Shopify orders error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to debug Shopify orders',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}