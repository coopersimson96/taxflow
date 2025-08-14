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
    
    // Try to get the correct shop domain - prefer the full myshopify.com domain
    const shopDomain = credentials?.shopInfo?.myshopify_domain || 
                      credentials?.shopInfo?.domain || 
                      credentials?.shop
                      
    // Try to get the access token from different possible fields
    const accessToken = credentials?.accessToken || credentials?.access_token
    
    if (!accessToken || !shopDomain) {
      return NextResponse.json({ 
        error: 'Invalid integration credentials',
        details: `Missing ${!accessToken ? 'access token' : 'shop domain'}`,
        credentials: {
          hasAccessToken: !!accessToken,
          shop: credentials?.shop,
          shopInfoDomain: credentials?.shopInfo?.domain,
          shopInfoMyshopifyDomain: credentials?.shopInfo?.myshopify_domain,
          selectedDomain: shopDomain
        }
      }, { status: 400 })
    }

    console.log('🔍 Testing Shopify API for store:', shopDomain)
    console.log('🔍 Integration details:', {
      id: integration.id,
      name: integration.name,
      status: integration.status,
      shop: shopDomain,
      hasAccessToken: !!accessToken,
      accessTokenLength: accessToken?.length || 0
    })

    // Test 1: Shop info
    console.log('📋 Testing shop info API...')
    let shopTest, shopData
    try {
      const shopResponse = await fetch(`https://${shopDomain}/admin/api/2024-01/shop.json`, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      })

      shopTest = {
        status: shopResponse.status,
        ok: shopResponse.ok,
        statusText: shopResponse.statusText
      }

      if (shopResponse.ok) {
        shopData = await shopResponse.json()
      } else {
        const errorText = await shopResponse.text()
        console.error('Shop API error response:', errorText)
        shopData = {
          error: errorText,
          status: shopResponse.status,
          statusText: shopResponse.statusText,
          headers: Object.fromEntries(shopResponse.headers.entries())
        }
      }
    } catch (error) {
      console.error('Shop info test failed:', error)
      shopTest = { status: 0, ok: false, statusText: 'Network Error' }
      shopData = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }

    // Test 2: Orders count
    console.log('📊 Testing orders count API...')
    let ordersCountTest, ordersCountData
    try {
      const ordersCountResponse = await fetch(`https://${shopDomain}/admin/api/2024-01/orders/count.json`, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      })

      ordersCountTest = {
        status: ordersCountResponse.status,
        ok: ordersCountResponse.ok,
        statusText: ordersCountResponse.statusText
      }

      if (ordersCountResponse.ok) {
        ordersCountData = await ordersCountResponse.json()
      } else {
        ordersCountData = await ordersCountResponse.text()
      }
    } catch (error) {
      console.error('Orders count test failed:', error)
      ordersCountTest = { status: 0, ok: false, statusText: 'Network Error' }
      ordersCountData = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }

    // Test 3: Recent orders (last 7 days)
    console.log('📦 Testing recent orders API...')
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    
    let recentOrdersTest, recentOrdersData
    try {
      const recentOrdersResponse = await fetch(
        `https://${shopDomain}/admin/api/2024-01/orders.json?status=any&created_at_min=${oneWeekAgo.toISOString()}&limit=5`,
        {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json'
          }
        }
      )

      recentOrdersTest = {
        status: recentOrdersResponse.status,
        ok: recentOrdersResponse.ok,
        statusText: recentOrdersResponse.statusText
      }

      if (recentOrdersResponse.ok) {
        recentOrdersData = await recentOrdersResponse.json()
      } else {
        recentOrdersData = await recentOrdersResponse.text()
      }
    } catch (error) {
      console.error('Recent orders test failed:', error)
      recentOrdersTest = { status: 0, ok: false, statusText: 'Network Error' }
      recentOrdersData = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }

    // Test 4: All orders count (any status)
    console.log('📈 Testing all orders count...')
    let allOrdersCountTest, allOrdersCountData
    try {
      const allOrdersCountResponse = await fetch(`https://${shopDomain}/admin/api/2024-01/orders/count.json?status=any`, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      })

      allOrdersCountTest = {
        status: allOrdersCountResponse.status,
        ok: allOrdersCountResponse.ok,
        statusText: allOrdersCountResponse.statusText
      }

      if (allOrdersCountResponse.ok) {
        allOrdersCountData = await allOrdersCountResponse.json()
      } else {
        allOrdersCountData = await allOrdersCountResponse.text()
      }
    } catch (error) {
      console.error('All orders count test failed:', error)
      allOrdersCountTest = { status: 0, ok: false, statusText: 'Network Error' }
      allOrdersCountData = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }

    return NextResponse.json({
      success: true,
      integration: {
        id: integration.id,
        name: integration.name,
        shop: shopDomain,
        hasAccessToken: !!accessToken,
        accessTokenPrefix: accessToken ? accessToken.substring(0, 6) + '...' : null
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
    
    const errorDetails = {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
      type: typeof error,
      stringified: JSON.stringify(error)
    }
    
    console.error('Detailed error info:', errorDetails)
    
    return NextResponse.json(
      { 
        error: 'Failed to test Shopify API',
        details: errorDetails.message,
        debugInfo: errorDetails
      },
      { status: 500 }
    )
  }
}