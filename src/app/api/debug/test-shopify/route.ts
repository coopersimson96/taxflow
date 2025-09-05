import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's integration
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        organizations: {
          include: {
            organization: {
              include: {
                integrations: {
                  where: { type: 'SHOPIFY' }
                }
              }
            }
          }
        }
      }
    })

    if (!user || user.organizations.length === 0) {
      return NextResponse.json({ error: 'No organizations found' })
    }

    const integration = user.organizations[0]?.organization.integrations[0]
    if (!integration) {
      return NextResponse.json({ error: 'No Shopify integration found' })
    }

    const credentials = integration.credentials as any
    const shop = credentials.shop
    const accessToken = credentials.accessToken

    // Test 1: Basic shop info
    const shopInfoUrl = `https://${shop}/admin/api/2024-01/shop.json`
    const shopResponse = await fetch(shopInfoUrl, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    })

    const shopResult = {
      url: shopInfoUrl,
      status: shopResponse.status,
      ok: shopResponse.ok,
      statusText: shopResponse.statusText,
      data: shopResponse.ok ? await shopResponse.json() : await shopResponse.text()
    }

    // Test 2: Try to fetch orders count
    const ordersCountUrl = `https://${shop}/admin/api/2024-01/orders/count.json?status=any`
    const ordersResponse = await fetch(ordersCountUrl, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    })

    const ordersResult = {
      url: ordersCountUrl,
      status: ordersResponse.status,
      ok: ordersResponse.ok,
      statusText: ordersResponse.statusText,
      data: ordersResponse.ok ? await ordersResponse.json() : await ordersResponse.text()
    }

    return NextResponse.json({
      integration: {
        id: integration.id,
        shop: shop,
        hasAccessToken: !!accessToken,
        tokenLength: accessToken?.length,
        status: integration.status
      },
      tests: {
        shopInfo: shopResult,
        ordersCount: ordersResult
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Test Shopify error:', error)
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}