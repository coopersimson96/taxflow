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

    // Try different Shopify payout endpoints
    const payoutEndpoints = [
      `/admin/api/2024-01/shopify_payments/balance/transactions.json`, // Balance transactions
      `/admin/api/2024-01/shopify_payments/payouts.json`, // Payouts
      `/admin/api/2024-01/transactions.json`, // Shop transactions
    ]

    const results: any = {}

    for (const endpoint of payoutEndpoints) {
      try {
        const requestUrl = `https://${shopDomain}${endpoint}?limit=20`
        console.log('🌐 Testing endpoint:', requestUrl)
        
        const fetchResponse = await fetch(requestUrl, {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json'
          }
        })

        const responseText = await fetchResponse.text()
        let responseData = null
        
        try {
          responseData = JSON.parse(responseText)
        } catch (e) {
          responseData = { error: 'Invalid JSON', text: responseText }
        }

        results[endpoint] = {
          status: fetchResponse.status,
          ok: fetchResponse.ok,
          data: responseData,
          headers: Object.fromEntries(fetchResponse.headers.entries())
        }
      } catch (error) {
        results[endpoint] = {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }

    // Also try to get the specific payout for today if date provided
    if (targetDate) {
      try {
        const date = new Date(targetDate)
        const dateStr = date.toISOString().split('T')[0]
        
        // Try balance transactions for specific date
        const balanceUrl = `https://${shopDomain}/admin/api/2024-01/shopify_payments/balance/transactions.json?processed_at_min=${dateStr}&processed_at_max=${dateStr}T23:59:59Z`
        console.log('🌐 Fetching balance transactions for date:', balanceUrl)
        
        const balanceResponse = await fetch(balanceUrl, {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json'
          }
        })

        const balanceData = await balanceResponse.json()
        results.dateSpecificBalance = {
          status: balanceResponse.status,
          ok: balanceResponse.ok,
          data: balanceData
        }
      } catch (error) {
        results.dateSpecificBalance = {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }

    // Analyze what we found
    const analysis = {
      hasShopifyPayments: false,
      availableEndpoints: [] as string[],
      payoutData: null as any,
      recommendations: [] as string[]
    }

    // Check each endpoint result
    for (const [endpoint, result] of Object.entries(results)) {
      const res = result as any
      if (res.ok && res.data) {
        analysis.availableEndpoints.push(endpoint)
        
        if (endpoint.includes('balance/transactions') && res.data.transactions) {
          analysis.hasShopifyPayments = true
          analysis.payoutData = res.data.transactions
        } else if (endpoint.includes('payouts') && res.data.payouts) {
          analysis.hasShopifyPayments = true
          analysis.payoutData = res.data.payouts
        }
      }
    }

    // Provide recommendations
    if (!analysis.hasShopifyPayments) {
      analysis.recommendations.push('Shopify Payments may not be enabled for this store')
      analysis.recommendations.push('Consider using order financial_status to track payments')
    } else {
      analysis.recommendations.push('Use balance/transactions endpoint for daily payouts')
      analysis.recommendations.push('Match transaction IDs with orders for tax calculation')
    }

    return NextResponse.json({
      success: true,
      results,
      analysis,
      shopDomain,
      message: 'Payout API exploration complete'
    })

  } catch (error) {
    console.error('Debug Shopify payouts error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to debug Shopify payouts',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}