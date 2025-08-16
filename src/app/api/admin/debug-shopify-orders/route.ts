import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { withWebhookDb } from '@/lib/prisma'

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
    
    // Calculate date range for the target date in PST
    const year = compareDate.getFullYear()
    const month = compareDate.getMonth()
    const date = compareDate.getDate()
    
    // PST midnight to midnight+1 day
    const dayStartPST = new Date()
    dayStartPST.setFullYear(year, month, date)
    dayStartPST.setHours(0, 0, 0, 0)
    
    const dayEndPST = new Date(dayStartPST.getTime() + 24 * 60 * 60 * 1000)

    // Fetch orders from Shopify for that specific day
    const requestUrl = `https://${shopDomain}/admin/api/2024-01/orders.json?status=any&created_at_min=${dayStartPST.toISOString()}&created_at_max=${dayEndPST.toISOString()}&limit=250`
    
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

    // Analyze the different price fields available
    const analysis = {
      totalOrders: orders.length,
      dateRange: {
        start: dayStartPST.toISOString(),
        end: dayEndPST.toISOString()
      },
      priceFieldAnalysis: {
        total_price: orders.reduce((sum: number, order: any) => sum + parseFloat(order.total_price || '0'), 0),
        subtotal_price: orders.reduce((sum: number, order: any) => sum + parseFloat(order.subtotal_price || '0'), 0),
        current_total_price: orders.reduce((sum: number, order: any) => sum + parseFloat(order.current_total_price || '0'), 0),
        total_tax: orders.reduce((sum: number, order: any) => sum + parseFloat(order.total_tax || '0'), 0),
        total_discounts: orders.reduce((sum: number, order: any) => sum + parseFloat(order.total_discounts || '0'), 0),
        total_shipping: orders.reduce((sum: number, order: any) => sum + parseFloat(order.total_shipping_price_set?.shop_money?.amount || '0'), 0)
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