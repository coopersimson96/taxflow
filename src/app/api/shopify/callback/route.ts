import { NextRequest, NextResponse } from 'next/server'
import { ShopifyService } from '@/lib/services/shopify-service'
import { prisma } from '@/lib/prisma'
import { UserService } from '@/lib/services/user-service'

export const dynamic = 'force-dynamic'


export async function GET(request: NextRequest) {
  try {
    console.log('=== SHOPIFY CALLBACK RECEIVED ===')
    console.log('Full URL:', request.url)
    console.log('Method:', request.method)
    
    const searchParams = request.nextUrl.searchParams
    const allParams = Object.fromEntries(searchParams.entries())
    console.log('All parameters received:', allParams)
    
    const code = searchParams.get('code')
    const shop = searchParams.get('shop')
    const state = searchParams.get('state')
    const hmac = searchParams.get('hmac')
    const error = searchParams.get('error')
    const error_description = searchParams.get('error_description')

    console.log('OAuth parameters:', { code: !!code, shop, state: !!state, hmac: !!hmac, error, error_description })

    // Check for Shopify OAuth errors first
    if (error) {
      console.error('Shopify OAuth error:', error, error_description)
      return NextResponse.redirect(
        new URL(`/connect?error=shopify_oauth_error&details=${encodeURIComponent(error_description || error)}`, request.url)
      )
    }

    // Validate required parameters
    if (!code || !shop || !state || !hmac) {
      console.error('Missing required OAuth parameters')
      console.error('Missing:', { 
        code: !code, 
        shop: !shop, 
        state: !state, 
        hmac: !hmac 
      })
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
      console.log('Starting callback process for shop:', normalizedShop)
      console.log('Code received:', code ? `${code.substring(0, 10)}...` : 'null')
      
      // Exchange code for access token
      console.log('Exchanging code for token...')
      const tokens = await ShopifyService.exchangeCodeForToken(normalizedShop, code)
      console.log('Token exchange successful, scopes:', tokens.scope)
      
      // Get shop information
      console.log('Getting shop information...')
      const shopInfo = await ShopifyService.getShopInfo(normalizedShop, tokens.accessToken)
      console.log('Shop info retrieved:', shopInfo.shop.name)
      
      // TODO: In production, verify state parameter matches stored value
      // For now, we'll proceed with storing the integration

      // Store integration in database with proper organization context
      // For production, we would decode and verify the state parameter to get user info
      // For now, we'll use a session-based approach or find the most recent user
      
      // Find or create organization for this integration
      // In a real app, you'd get this from the authenticated state
      let organizationId: string
      
      try {
        console.log('Setting up organization...')
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
          console.log('Found existing integration, using org:', existingIntegration.organizationId)
          organizationId = existingIntegration.organizationId
        } else {
          console.log('Creating new organization...')
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
          console.log('Organization created:', organization.id)
          organizationId = organization.id
        }
      } catch (orgError) {
        console.error('Organization setup error:', orgError)
        console.error('Error details:', {
          message: orgError instanceof Error ? orgError.message : 'Unknown error',
          stack: orgError instanceof Error ? orgError.stack : 'No stack trace'
        })
        // Fallback to a default organization ID
        organizationId = 'default-org'
      }

      console.log('Creating/updating integration...')
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
      console.error('Error details:', {
        message: tokenError instanceof Error ? tokenError.message : 'Unknown error',
        stack: tokenError instanceof Error ? tokenError.stack : 'No stack trace',
        shop: normalizedShop,
        codePresent: !!code
      })
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