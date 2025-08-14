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
    
    // Get shop domain and access token
    const shopDomain = credentials?.shopInfo?.myshopify_domain || 
                      credentials?.shopInfo?.domain || 
                      credentials?.shop
    const accessToken = credentials?.accessToken || credentials?.access_token

    if (!accessToken || !shopDomain) {
      return NextResponse.json({ 
        error: 'Missing credentials',
        details: { hasToken: !!accessToken, hasDomain: !!shopDomain }
      }, { status: 400 })
    }

    console.log('🔍 Validating token for shop:', shopDomain)
    console.log('🔑 Token format:', accessToken.startsWith('shpat_') ? 'Private App' : 
                                    accessToken.startsWith('shpca_') ? 'Custom App' : 'Unknown')

    // Test the token with a simple API call
    const testUrl = `https://${shopDomain}/admin/api/2024-01/shop.json`
    console.log('🌐 Testing URL:', testUrl)

    const response = await fetch(testUrl, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    })

    console.log('📊 Response status:', response.status)
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()))

    let responseData
    let isJson = false
    
    try {
      responseData = await response.json()
      isJson = true
    } catch {
      responseData = await response.text()
      isJson = false
    }

    console.log('📊 Response data:', responseData)

    // Analyze the response
    let analysis = {
      tokenValid: response.ok,
      httpStatus: response.status,
      shopifyError: null,
      permissions: null,
      recommendation: null
    }

    if (response.status === 401) {
      analysis.shopifyError = isJson ? responseData.errors || responseData.error : responseData
      analysis.recommendation = "Token is invalid, expired, or app was uninstalled. May need to re-authenticate."
    } else if (response.status === 403) {
      analysis.shopifyError = isJson ? responseData.errors || responseData.error : responseData
      analysis.recommendation = "Token lacks required permissions. Check app scopes include 'read_orders'."
    } else if (response.status === 404) {
      analysis.recommendation = "Shop domain may be incorrect or shop may not exist."
    } else if (response.ok && responseData.shop) {
      analysis.permissions = "Token has basic shop access"
      analysis.recommendation = "Token appears valid. Try testing orders API specifically."
    }

    return NextResponse.json({
      success: true,
      integration: {
        id: integration.id,
        name: integration.name,
        shop: shopDomain
      },
      token: {
        present: !!accessToken,
        format: accessToken.startsWith('shpat_') ? 'Private App Token' : 
               accessToken.startsWith('shpca_') ? 'Custom App Token' : 'Unknown Format',
        length: accessToken.length,
        prefix: accessToken.substring(0, 8) + '...'
      },
      apiTest: {
        url: testUrl,
        status: response.status,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      },
      response: {
        data: responseData,
        isJson
      },
      analysis
    })

  } catch (error) {
    console.error('Token validation error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to validate token',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}