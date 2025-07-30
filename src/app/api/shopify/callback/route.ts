import { NextRequest, NextResponse } from 'next/server'
import { ShopifyService } from '@/lib/services/shopify-service'
import { prisma } from '@/lib/prisma'
import { UserService } from '@/lib/services/user-service'

export const dynamic = 'force-dynamic'


export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const shop = searchParams.get('shop')
    const state = searchParams.get('state')
    const hmac = searchParams.get('hmac')

    // Validate required parameters
    if (!code || !shop || !state || !hmac) {
      console.error('Missing required OAuth parameters')
      return NextResponse.redirect(
        new URL('/connect?error=missing_parameters', request.url)
      )
    }

    // Verify HMAC signature
    const queryString = request.nextUrl.search.substring(1) // Remove leading '?'
    const queryWithoutHmac = queryString
      .split('&')
      .filter(param => !param.startsWith('hmac='))
      .sort()
      .join('&')

    if (!ShopifyService.verifyHmac(queryWithoutHmac, hmac)) {
      console.error('Invalid HMAC signature')
      return NextResponse.redirect(
        new URL('/connect?error=invalid_signature', request.url)
      )
    }

    // Normalize shop domain
    const normalizedShop = ShopifyService.normalizeShopDomain(shop)

    try {
      // Exchange code for access token
      const tokens = await ShopifyService.exchangeCodeForToken(normalizedShop, code)
      
      // Get shop information
      const shopInfo = await ShopifyService.getShopInfo(normalizedShop, tokens.accessToken)
      
      // TODO: In production, verify state parameter matches stored value
      // For now, we'll proceed with storing the integration

      // Store integration in database with proper organization context
      // For production, we would decode and verify the state parameter to get user info
      // For now, we'll use a session-based approach or find the most recent user
      
      // Find or create organization for this integration
      // In a real app, you'd get this from the authenticated state
      let organizationId: string
      
      try {
        // Try to find an existing organization or create a default one
        // This is a simplified approach - in production, get from authenticated user context
        const existingIntegration = await prisma.integration.findFirst({
          where: {
            type: 'SHOPIFY',
            credentials: {
              path: ['shop'],
              equals: normalizedShop
            }
          }
        })

        if (existingIntegration) {
          organizationId = existingIntegration.organizationId
        } else {
          // Create a new organization for this shop
          const organization = await prisma.organization.create({
            data: {
              name: `${shopInfo.shop.name || normalizedShop} Tax Tracker`,
              slug: `${normalizedShop}-tax-tracker`,
              description: `Tax tracking organization for ${shopInfo.shop.name || normalizedShop}`,
              settings: {
                shopifyShop: normalizedShop,
                timezone: shopInfo.shop.timezone || 'America/New_York'
              }
            }
          })
          organizationId = organization.id
        }
      } catch (orgError) {
        console.error('Organization setup error:', orgError)
        // Fallback to a default organization ID
        organizationId = 'default-org'
      }

      const integration = await prisma.integration.upsert({
        where: {
          organizationId_type: {
            organizationId: organizationId,
            type: 'SHOPIFY'
          }
        },
        update: {
          name: shopInfo.shop.name || normalizedShop,
          status: 'CONNECTED',
          credentials: {
            accessToken: tokens.accessToken,
            scope: tokens.scope,
            shop: normalizedShop,
            shopInfo: shopInfo.shop
          },
          lastSyncAt: new Date(),
          syncStatus: 'SUCCESS',
          syncError: null
        },
        create: {
          organizationId: organizationId,
          type: 'SHOPIFY',
          name: shopInfo.shop.name || normalizedShop,
          status: 'CONNECTED',
          credentials: {
            accessToken: tokens.accessToken,
            scope: tokens.scope,
            shop: normalizedShop,
            shopInfo: shopInfo.shop
          },
          syncStatus: 'SUCCESS'
        }
      })

      // Setup webhooks
      try {
        await ShopifyService.setupWebhooks(normalizedShop, tokens.accessToken)
        console.log(`✅ Webhooks setup completed for ${normalizedShop}`)
      } catch (webhookError) {
        console.error('Webhook setup failed:', webhookError)
        // Don't fail the entire flow for webhook issues
      }

      // Redirect to success page
      return NextResponse.redirect(
        new URL(`/connect?success=true&shop=${normalizedShop}`, request.url)
      )

    } catch (tokenError) {
      console.error('Token exchange failed:', tokenError)
      return NextResponse.redirect(
        new URL('/connect?error=token_exchange_failed', request.url)
      )
    }

  } catch (error) {
    console.error('Shopify OAuth callback error:', error)
    return NextResponse.redirect(
      new URL('/connect?error=callback_failed', request.url)
    )
  }
}