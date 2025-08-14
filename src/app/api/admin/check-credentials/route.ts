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
    console.log('🔍 Raw credentials object:', JSON.stringify(credentials, null, 2))
    
    // Analyze the credentials structure
    const analysis = {
      hasCredentials: !!credentials,
      credentialsType: typeof credentials,
      credentialsKeys: credentials ? Object.keys(credentials) : [],
      
      // Check for common shop domain fields
      shop: credentials?.shop,
      shopDomain: credentials?.shopDomain, 
      domain: credentials?.domain,
      myshopifyDomain: credentials?.myshopify_domain,
      
      // Check for access token fields
      accessToken: credentials?.accessToken ? `${credentials.accessToken.substring(0, 8)}...` : null,
      access_token: credentials?.access_token ? `${credentials.access_token.substring(0, 8)}...` : null,
      accessTokenLength: credentials?.accessToken?.length || 0,
      access_tokenLength: credentials?.access_token?.length || 0,
      
      // Check token format (Shopify tokens usually start with 'shpat_' for private apps or 'shpca_' for custom apps)
      accessTokenFormat: credentials?.accessToken ? 
        (credentials.accessToken.startsWith('shpat_') ? 'Private App Token' :
         credentials.accessToken.startsWith('shpca_') ? 'Custom App Token' :
         credentials.accessToken.startsWith('shpss_') ? 'Storefront Token (wrong type)' :
         'Unknown token format') : null,
      
      // Check shopInfo nested object
      shopInfo: credentials?.shopInfo,
      shopInfoKeys: credentials?.shopInfo ? Object.keys(credentials.shopInfo) : [],
      shopInfoDomain: credentials?.shopInfo?.domain,
      shopInfoMyshopifyDomain: credentials?.shopInfo?.myshopify_domain,
      
      // Integration details
      integrationName: integration.name,
      integrationStatus: integration.status,
      organizationName: integration.organization.name
    }

    console.log('🔍 Credentials analysis:', analysis)

    // Try to construct the correct shop URL
    const possibleShopUrls = []
    
    if (credentials?.shop) {
      possibleShopUrls.push(`Shop field: ${credentials.shop}`)
    }
    if (credentials?.shopDomain) {
      possibleShopUrls.push(`ShopDomain field: ${credentials.shopDomain}`)
    }
    if (credentials?.shopInfo?.domain) {
      possibleShopUrls.push(`ShopInfo.domain: ${credentials.shopInfo.domain}`)
    }
    if (credentials?.shopInfo?.myshopify_domain) {
      possibleShopUrls.push(`ShopInfo.myshopify_domain: ${credentials.shopInfo.myshopify_domain}`)
    }

    return NextResponse.json({
      success: true,
      integration: {
        id: integration.id,
        name: integration.name,
        status: integration.status
      },
      analysis,
      possibleShopUrls,
      recommendation: possibleShopUrls.length > 0 ? 
        'Found potential shop domains above. The correct format should be: shop-name.myshopify.com' :
        'No shop domain found in credentials. This might be why API calls are failing.'
    })

  } catch (error) {
    console.error('Check credentials error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to check credentials',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}