import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { integrationId } = await request.json()

    if (!integrationId) {
      return NextResponse.json({ error: 'Integration ID required' }, { status: 400 })
    }

    // Get integration with credentials
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

    console.log('🔍 Testing Shopify API for store:', credentials.shop)

    // Test 1: Shop info
    console.log('📋 Testing shop info API...')
    const shopResponse = await fetch(`https://${credentials.shop}/admin/api/2024-01/shop.json`, {
      headers: {
        'X-Shopify-Access-Token': credentials.accessToken,
        'Content-Type': 'application/json'
      }
    })

    const shopTest = {
      status: shopResponse.status,
      ok: shopResponse.ok,
      statusText: shopResponse.statusText
    }

    let shopData = null
    if (shopResponse.ok) {
      shopData = await shopResponse.json()
    } else {
      shopData = await shopResponse.text()
    }

    // Test 2: Orders count
    console.log('📊 Testing orders count API...')
    const ordersCountResponse = await fetch(`https://${credentials.shop}/admin/api/2024-01/orders/count.json`, {
      headers: {
        'X-Shopify-Access-Token': credentials.accessToken,
        'Content-Type': 'application/json'
      }
    })

    const ordersCountTest = {
      status: ordersCountResponse.status,
      ok: ordersCountResponse.ok,
      statusText: ordersCountResponse.statusText
    }

    let ordersCountData = null
    if (ordersCountResponse.ok) {
      ordersCountData = await ordersCountResponse.json()
    } else {
      ordersCountData = await ordersCountResponse.text()
    }

    // Test 3: Recent orders (last 7 days)
    console.log('📦 Testing recent orders API...')
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    const recentOrdersResponse = await fetch(
      `https://${credentials.shop}/admin/api/2024-01/orders.json?status=any&created_at_min=${oneWeekAgo.toISOString()}&limit=5`,
      {
        headers: {
          'X-Shopify-Access-Token': credentials.accessToken,
          'Content-Type': 'application/json'
        }
      }
    )

    const recentOrdersTest = {
      status: recentOrdersResponse.status,
      ok: recentOrdersResponse.ok,
      statusText: recentOrdersResponse.statusText
    }

    let recentOrdersData = null
    if (recentOrdersResponse.ok) {
      recentOrdersData = await recentOrdersResponse.json()
    } else {
      recentOrdersData = await recentOrdersResponse.text()
    }

    // Test 4: All orders count (any status)
    console.log('📈 Testing all orders count...')
    const allOrdersCountResponse = await fetch(`https://${credentials.shop}/admin/api/2024-01/orders/count.json?status=any`, {
      headers: {
        'X-Shopify-Access-Token': credentials.accessToken,
        'Content-Type': 'application/json'
      }
    })

    const allOrdersCountTest = {
      status: allOrdersCountResponse.status,
      ok: allOrdersCountResponse.ok,
      statusText: allOrdersCountResponse.statusText
    }

    let allOrdersCountData = null
    if (allOrdersCountResponse.ok) {
      allOrdersCountData = await allOrdersCountResponse.json()
    } else {
      allOrdersCountData = await allOrdersCountResponse.text()
    }

    return NextResponse.json({
      success: true,
      integration: {
        id: integration.id,
        name: integration.name,
        shop: credentials.shop,
        hasAccessToken: !!credentials.accessToken,
        accessTokenPrefix: credentials.accessToken ? credentials.accessToken.substring(0, 6) + '...' : null
      },
      tests: {
        shopInfo: {
          test: shopTest,
          data: shopData
        },
        ordersCount: {
          test: ordersCountTest,
          data: ordersCountData
        },
        recentOrders: {
          test: recentOrdersTest,
          data: recentOrdersData,
          query: `Last 7 days from ${oneWeekAgo.toISOString()}`
        },
        allOrdersCount: {
          test: allOrdersCountTest,
          data: allOrdersCountData
        }
      }
    })

  } catch (error) {
    console.error('Shopify API debug error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to test Shopify API',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}