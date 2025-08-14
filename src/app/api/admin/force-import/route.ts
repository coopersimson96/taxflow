import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ShopifyService } from '@/lib/services/shopify-service'
import { processTaxData } from '@/lib/services/tax-processor'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { integrationId, months = 12 } = await request.json()

    if (!integrationId) {
      return NextResponse.json({ error: 'Integration ID required' }, { status: 400 })
    }

    console.log('🚀 Starting force import for integration:', integrationId)

    // Get integration with full details
    const integration = await prisma.integration.findUnique({
      where: { id: integrationId },
      include: {
        organization: {
          include: {
            members: {
              where: {
                user: {
                  email: session.user.email
                }
              }
            }
          }
        }
      }
    })

    if (!integration || integration.organization.members.length === 0) {
      return NextResponse.json({ error: 'Integration not found or access denied' }, { status: 404 })
    }

    const credentials = integration.credentials as any
    if (!credentials?.accessToken || !credentials?.shop) {
      return NextResponse.json({ error: 'Invalid integration credentials' }, { status: 400 })
    }

    console.log('📊 Starting order fetch from Shopify...')

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - months)

    // Fetch orders directly from Shopify
    let allOrders = []
    let hasNextPage = true
    let pageInfo = null
    let totalFetched = 0

    while (hasNextPage && totalFetched < 1000) { // Limit to 1000 orders for safety
      try {
        const response = await fetch(
          `https://${credentials.shop}/admin/api/2024-01/orders.json?status=any&created_at_min=${startDate.toISOString()}&limit=250${pageInfo ? `&page_info=${pageInfo}` : ''}`,
          {
            headers: {
              'X-Shopify-Access-Token': credentials.accessToken,
              'Content-Type': 'application/json'
            }
          }
        )

        if (!response.ok) {
          console.error('Shopify API error:', response.status, response.statusText)
          break
        }

        const data = await response.json()
        allOrders = [...allOrders, ...data.orders]
        totalFetched += data.orders.length

        // Check for pagination
        const linkHeader = response.headers.get('Link')
        if (linkHeader && linkHeader.includes('rel="next"')) {
          const matches = linkHeader.match(/page_info=([^>]+)>; rel="next"/)
          pageInfo = matches ? matches[1] : null
          hasNextPage = !!pageInfo
        } else {
          hasNextPage = false
        }

        console.log(`📦 Fetched ${data.orders.length} orders (total: ${totalFetched})`)
      } catch (error) {
        console.error('Error fetching orders:', error)
        break
      }
    }

    console.log(`✅ Fetched ${allOrders.length} total orders from Shopify`)

    // Process orders and save to database
    let processedCount = 0
    let errorCount = 0

    for (const order of allOrders) {
      try {
        // Skip draft or cancelled orders
        if (order.cancelled_at || order.financial_status === 'voided') {
          continue
        }

        // Process tax data
        const taxData = processTaxData(order)

        // Save transaction
        await prisma.transaction.upsert({
          where: {
            organizationId_integrationId_externalId: {
              organizationId: integration.organizationId,
              integrationId: integration.id,
              externalId: order.id.toString()
            }
          },
          update: {
            totalAmount: Math.round(parseFloat(order.total_price) * 100),
            taxAmount: Math.round(parseFloat(order.total_tax || '0') * 100),
            subtotal: Math.round(parseFloat(order.subtotal_price || '0') * 100),
            ...taxData,
            status: 'COMPLETED',
            transactionDate: new Date(order.created_at),
            updatedAt: new Date()
          },
          create: {
            organizationId: integration.organizationId,
            integrationId: integration.id,
            externalId: order.id.toString(),
            orderNumber: order.order_number?.toString() || order.name,
            type: 'SALE',
            status: 'COMPLETED',
            currency: order.currency,
            totalAmount: Math.round(parseFloat(order.total_price) * 100),
            taxAmount: Math.round(parseFloat(order.total_tax || '0') * 100),
            subtotal: Math.round(parseFloat(order.subtotal_price || '0') * 100),
            discountAmount: Math.round(parseFloat(order.total_discounts || '0') * 100),
            shippingAmount: Math.round(parseFloat(order.total_shipping_price_set?.shop_money?.amount || '0') * 100),
            ...taxData,
            customerEmail: order.email || order.customer?.email,
            customerName: order.customer ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim() : null,
            billingAddress: order.billing_address,
            shippingAddress: order.shipping_address,
            items: order.line_items || [],
            transactionDate: new Date(order.created_at),
            metadata: {
              shopifyOrderId: order.id,
              shopifyOrderNumber: order.order_number,
              financialStatus: order.financial_status,
              fulfillmentStatus: order.fulfillment_status
            }
          }
        })

        processedCount++
        
        if (processedCount % 50 === 0) {
          console.log(`⚡ Processed ${processedCount} orders...`)
        }
      } catch (error) {
        console.error(`Error processing order ${order.id}:`, error)
        errorCount++
      }
    }

    // Update integration config
    await prisma.integration.update({
      where: { id: integrationId },
      data: {
        lastSyncAt: new Date(),
        config: {
          ...(integration.config as any || {}),
          historicalImportCompleted: true,
          historicalImportDate: new Date().toISOString(),
          historicalImportRange: `${months} months`,
          lastImportOrderCount: processedCount
        }
      }
    })

    console.log('✅ Force import completed!')

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${processedCount} orders`,
      details: {
        totalOrdersFetched: allOrders.length,
        ordersProcessed: processedCount,
        errors: errorCount,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        }
      }
    })

  } catch (error) {
    console.error('Force import error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to import orders',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}