import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { IntegrationService } from '@/lib/services/integration-service'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's integration using robust service
    const { integration, debugInfo } = await IntegrationService.getUserIntegrationWithContext(session.user.email!)

    if (!integration) {
      return NextResponse.json({ 
        error: 'No Shopify integration found',
        debugInfo,
        troubleshooting: {
          commonCauses: [
            'User account not linked to any organization',
            'No Shopify store connected to your account',
            'Integration in PENDING_USER_LINK status',
            'Email mismatch between OAuth and Shopify store owner'
          ],
          nextSteps: debugInfo.needsOrganization ? 
            ['Sign out and sign back in to create default organization'] :
            debugInfo.needsShopifyConnection ?
            ['Connect your Shopify store through the integrations page'] :
            ['Contact support for manual account linking']
        }
      }, { status: 404 })
    }
    const credentials = integration.credentials as any

    if (!credentials?.accessToken) {
      return NextResponse.json({ error: 'No access token found' }, { status: 400 })
    }

    const accessToken = credentials.accessToken
    const shopDomain = credentials.shopInfo?.myshopify_domain || credentials.shopInfo?.domain

    if (!shopDomain) {
      return NextResponse.json({ error: 'Shop domain not found' }, { status: 400 })
    }

    const diagnosis: any = {
      shopDomain,
      hasAccessToken: !!accessToken,
      shopInfo: credentials.shopInfo,
      apiTests: {},
      recommendations: []
    }

    // Test 1: Check shop info (basic access)
    try {
      const shopResponse = await fetch(`https://${shopDomain}/admin/api/2024-01/shop.json`, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      })

      diagnosis.apiTests.shopInfo = {
        status: shopResponse.status,
        ok: shopResponse.ok,
        data: shopResponse.ok ? await shopResponse.json() : await shopResponse.text()
      }
    } catch (error) {
      diagnosis.apiTests.shopInfo = {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // Test 2: Check orders (verify basic functionality)
    try {
      const ordersResponse = await fetch(`https://${shopDomain}/admin/api/2024-01/orders.json?limit=1&status=any`, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      })

      diagnosis.apiTests.orders = {
        status: ordersResponse.status,
        ok: ordersResponse.ok,
        data: ordersResponse.ok ? await ordersResponse.json() : await ordersResponse.text()
      }
    } catch (error) {
      diagnosis.apiTests.orders = {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // Test 3: Check Shopify Payments status
    try {
      const paymentsResponse = await fetch(`https://${shopDomain}/admin/api/2024-01/shopify_payments/account.json`, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      })

      diagnosis.apiTests.paymentsAccount = {
        status: paymentsResponse.status,
        ok: paymentsResponse.ok,
        data: paymentsResponse.ok ? await paymentsResponse.json() : await paymentsResponse.text()
      }
    } catch (error) {
      diagnosis.apiTests.paymentsAccount = {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // Test 4: Check payouts endpoint
    try {
      const payoutsResponse = await fetch(`https://${shopDomain}/admin/api/2024-01/shopify_payments/payouts.json?limit=1`, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      })

      diagnosis.apiTests.payouts = {
        status: payoutsResponse.status,
        ok: payoutsResponse.ok,
        data: payoutsResponse.ok ? await payoutsResponse.json() : await payoutsResponse.text()
      }
    } catch (error) {
      diagnosis.apiTests.payouts = {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // Test 5: Check balance transactions
    try {
      const balanceResponse = await fetch(`https://${shopDomain}/admin/api/2024-01/shopify_payments/balance/transactions.json?limit=1`, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      })

      diagnosis.apiTests.balanceTransactions = {
        status: balanceResponse.status,
        ok: balanceResponse.ok,
        data: balanceResponse.ok ? await balanceResponse.json() : await balanceResponse.text()
      }
    } catch (error) {
      diagnosis.apiTests.balanceTransactions = {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // Analyze results and provide recommendations
    if (diagnosis.apiTests.shopInfo?.ok) {
      diagnosis.recommendations.push("✅ Basic API access is working")
    } else {
      diagnosis.recommendations.push("❌ Basic API access failed - check access token")
    }

    if (diagnosis.apiTests.orders?.ok) {
      diagnosis.recommendations.push("✅ Orders API access is working")
    } else {
      diagnosis.recommendations.push("❌ Orders API access failed")
    }

    if (diagnosis.apiTests.paymentsAccount?.status === 404) {
      diagnosis.recommendations.push("❌ Shopify Payments not enabled on this store")
    } else if (diagnosis.apiTests.paymentsAccount?.status === 401) {
      diagnosis.recommendations.push("❌ No permission to access Shopify Payments - need 'read_shopify_payments' scope")
    } else if (diagnosis.apiTests.paymentsAccount?.ok) {
      diagnosis.recommendations.push("✅ Shopify Payments account access working")
    }

    if (diagnosis.apiTests.payouts?.status === 401) {
      diagnosis.recommendations.push("❌ No permission to access payouts - need 'read_shopify_payments' scope")
    } else if (diagnosis.apiTests.payouts?.ok) {
      diagnosis.recommendations.push("✅ Payouts API access working")
    }

    if (diagnosis.apiTests.balanceTransactions?.status === 401) {
      diagnosis.recommendations.push("❌ No permission to access balance transactions - need 'read_shopify_payments' scope")
    } else if (diagnosis.apiTests.balanceTransactions?.ok) {
      diagnosis.recommendations.push("✅ Balance transactions API access working")
    }

    // Determine next steps
    const hasPaymentErrors = diagnosis.apiTests.payouts?.status === 401 || 
                           diagnosis.apiTests.balanceTransactions?.status === 401 ||
                           diagnosis.apiTests.paymentsAccount?.status === 401

    if (hasPaymentErrors) {
      diagnosis.nextSteps = [
        "1. Add 'read_shopify_payments' scope to your Shopify app configuration",
        "2. Regenerate the access token with new permissions",
        "3. Ensure the store has Shopify Payments enabled",
        "4. Re-authenticate the integration with expanded scopes"
      ]
    }

    return NextResponse.json({
      success: true,
      diagnosis
    })

  } catch (error) {
    console.error('Shopify API diagnosis error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to diagnose Shopify API',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}