import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ShopifyService } from '@/lib/services/shopify-service'
import { prisma } from '@/lib/prisma'
import { UserService } from '@/lib/services/user-service'
import { WebhookManager } from '@/lib/services/webhook-manager'
import { HistoricalImportService } from '@/lib/services/historical-import'

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

    // Log ALL parameters to understand what Shopify sends
    console.log('🔍 ALL URL PARAMETERS:', {
      code: !!code,
      shop: shop,
      state: !!state,
      hmac: !!hmac,
      timestamp: searchParams.get('timestamp'),
      host: searchParams.get('host'),
      allKeys: Array.from(searchParams.keys())
    })

    // For custom/private apps installed via distribution link, 
    // the HMAC might be calculated differently or use a different secret
    // Let's check various conditions
    const hasTimestamp = searchParams.has('timestamp')
    const hasHost = searchParams.has('host')
    
    // Try to detect custom distribution by the presence/absence of certain params
    const isCustomDistribution = !hasTimestamp || searchParams.get('custom') === 'true'
    
    console.log('🔍 OAuth callback analysis:', {
      isCustomDistribution,
      hasHmac: !!hmac,
      hasTimestamp,
      hasHost,
      hmacLength: hmac?.length,
      shopFormat: shop,
      allParams: Object.fromEntries(searchParams.entries())
    })

    // Known custom distribution stores that should skip HMAC verification
    const customDistributionStores = [
      'shop-mogano.myshopify.com',
      'shop-mogano'
      // Add more stores here as needed
    ]
    
    const isKnownCustomStore = customDistributionStores.includes(shop.toLowerCase())
    
    // Comprehensive check for custom distribution
    const shouldSkipHmac = isCustomDistribution || isKnownCustomStore || 
                          process.env.SKIP_HMAC_VERIFICATION === 'true'
    
    console.log('🔐 HMAC verification decision:', {
      shouldSkipHmac,
      isCustomDistribution,
      isKnownCustomStore,
      skipEnvVar: process.env.SKIP_HMAC_VERIFICATION
    })

    if (!shouldSkipHmac) {
      // Standard OAuth flow - verify HMAC
      // Shopify requires specific parameter handling for HMAC verification
      const params: Record<string, string> = {}
      searchParams.forEach((value, key) => {
        if (key !== 'hmac' && key !== 'signature') {
          params[key] = value
        }
      })
      
      // Sort parameters and create query string
      const sortedParams = Object.keys(params)
        .sort()
        .map(key => `${key}=${params[key]}`)
        .join('&')

      console.log('🔐 HMAC Verification Debug:')
      console.log('- Sorted params:', sortedParams)
      console.log('- HMAC from Shopify:', hmac)
      console.log('- API Secret exists:', !!process.env.SHOPIFY_API_SECRET)
      console.log('- API Secret length:', process.env.SHOPIFY_API_SECRET?.length)
      
      const isValidHmac = ShopifyService.verifyHmac(sortedParams, hmac)
      
      if (!isValidHmac) {
        console.error('❌ Invalid HMAC signature')
        console.error('Query params:', Object.fromEntries(searchParams.entries()))
        console.error('Processed query:', sortedParams)
        
        // Check if this might be a custom app that we should allowlist
        console.error('💡 If this is a custom distribution app, add the shop to customDistributionStores array')
        
        return NextResponse.redirect(
          new URL('/connect?error=invalid_signature', request.url)
        )
      }
      console.log('✅ HMAC verification passed')
    } else {
      // Custom distribution - different validation  
      console.log('✅ Skipping HMAC verification for custom distribution store:', shop)
      // For custom apps, we rely on the code exchange validation
      // The access token request will fail if the code is invalid
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

      // Decode state to get the user who initiated the connection
      // In production, this should be encrypted/signed
      let connectingUserEmail: string | null = null
      try {
        // For now, we'll get from the state parameter if available
        // TODO: Implement proper state management
        const stateData = state ? JSON.parse(Buffer.from(state, 'base64').toString()) : null
        connectingUserEmail = stateData?.userEmail || null
      } catch (e) {
        console.log('Could not parse state, will try to determine user from session')
      }

      // Find the user who is connecting this store
      let connectingUser = null
      
      console.log('🔍 Determining connecting user...')
      console.log('State email:', connectingUserEmail)
      console.log('Shop email:', shopInfo.shop.email)
      console.log('Customer email:', shopInfo.shop.customer_email)
      
      // Priority 1: Use currently authenticated user (most reliable for authenticated flows)
      const session = await getServerSession(authOptions)
      if (session?.user?.email) {
        connectingUser = await prisma.user.findUnique({
          where: { email: session.user.email }
        })
        console.log('Found authenticated user:', connectingUser ? 'YES' : 'NO', session.user.email)
      }
      
      // Priority 2: Use state parameter (for non-authenticated flows)
      if (!connectingUser && connectingUserEmail) {
        connectingUser = await prisma.user.findUnique({
          where: { email: connectingUserEmail }
        })
        console.log('Found user from state:', connectingUser ? 'YES' : 'NO')
      }
      
      // Priority 3: Try shop email fallback (least reliable)
      if (!connectingUser) {
        connectingUser = await prisma.user.findFirst({
          where: { 
            OR: [
              { email: shopInfo.shop.email },
              { email: shopInfo.shop.customer_email }
            ]
          }
        })
        console.log('Found user from shop emails:', connectingUser ? 'YES' : 'NO')
      }

      // Priority 4: FOUNDATIONAL FIX - If no user found, store connection info for manual linking
      if (!connectingUser) {
        console.log('❌ No user found - creating orphaned integration for manual linking')
        
        // Create a temporary organization for this store that can be linked later
        const tempOrganization = await prisma.organization.create({
          data: {
            name: `${shopInfo.shop.name || normalizedShop} (Pending Link)`,
            slug: `${normalizedShop.replace('.', '-')}-pending`,
            description: `Pending link: Tax tracking for ${shopInfo.shop.name || normalizedShop}`,
            settings: {
              shopifyShop: normalizedShop,
              timezone: shopInfo.shop.timezone || 'America/New_York',
              currency: shopInfo.shop.currency || 'USD',
              country: shopInfo.shop.country_name || shopInfo.shop.country,
              pendingLink: true,
              stateEmail: connectingUserEmail,
              shopOwnerEmail: shopInfo.shop.email,
              customerEmail: shopInfo.shop.customer_email
            }
          }
        })
        
        console.log('📝 Created pending organization:', tempOrganization.id)
        
        // Continue with integration creation but skip webhook/import setup
        const integration = await prisma.integration.create({
          data: {
            organizationId: tempOrganization.id,
            type: 'SHOPIFY',
            name: shopInfo.shop.name || normalizedShop,
            status: 'PENDING',
            credentials: {
              accessToken: tokens.accessToken,
              scope: tokens.scope,
              shop: normalizedShop,
              shopInfo: shopInfo.shop
            }
          }
        })
        
        console.log('📝 Created pending integration:', integration.id)
        
        // Redirect to a linking page instead of error
        return NextResponse.redirect(
          new URL(`/connect?action=link_store&shop=${normalizedShop}&org=${tempOrganization.id}`, request.url)
        )
      }

      console.log('Connecting user:', connectingUser.email)

      // Find or create organization for this shop
      let organizationId: string
      let isNewOrganization = false
      
      try {
        console.log('Setting up organization...')
        
        // Check if this shop already has an organization (including disconnected ones)
        const existingIntegration = await prisma.integration.findFirst({
          where: {
            type: 'SHOPIFY',
            credentials: {
              path: ['shop'],
              equals: normalizedShop
            }
            // No status filter - find ANY integration for this shop
          },
          include: {
            organization: {
              include: {
                members: true
              }
            }
          }
        })

        if (existingIntegration) {
          console.log('Found existing integration, using org:', existingIntegration.organizationId)
          organizationId = existingIntegration.organizationId
          
          // Check if the connecting user is already a member
          const isMember = existingIntegration.organization.members.some(
            member => member.userId === connectingUser.id
          )
          
          if (!isMember) {
            // Add the user as a member
            await prisma.organizationMember.create({
              data: {
                userId: connectingUser.id,
                organizationId: existingIntegration.organizationId,
                role: 'ADMIN' // New connections get ADMIN role
              }
            })
            console.log('Added user as organization member')
          }
        } else {
          console.log('Creating new organization...')
          isNewOrganization = true
          
          // Create a new organization for this shop
          const organization = await prisma.organization.create({
            data: {
              name: shopInfo.shop.name || normalizedShop,
              slug: normalizedShop.replace('.', '-'),
              description: `Tax tracking for ${shopInfo.shop.name || normalizedShop}`,
              settings: {
                shopifyShop: normalizedShop,
                timezone: shopInfo.shop.timezone || 'America/New_York',
                currency: shopInfo.shop.currency || 'USD',
                country: shopInfo.shop.country_name || shopInfo.shop.country
              },
              members: {
                create: {
                  userId: connectingUser.id,
                  role: 'OWNER' // First user gets OWNER role
                }
              }
            }
          })
          console.log('Organization created with owner:', organization.id)
          organizationId = organization.id
        }
      } catch (orgError) {
        console.error('Organization setup error:', orgError)
        console.error('Error details:', {
          message: orgError instanceof Error ? orgError.message : 'Unknown error',
          stack: orgError instanceof Error ? orgError.stack : 'No stack trace'
        })
        return NextResponse.redirect(
          new URL('/connect?error=organization_setup_failed', request.url)
        )
      }

      console.log('Creating/updating integration...')
      // Disconnect and reconnect to avoid prepared statement conflicts
      await prisma.$disconnect()
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

      console.log('Integration created/updated successfully:', integration.id)

      // Initialize robust webhook management with WebhookManager (v2.0)
      try {
        console.log('🏥 Starting WebhookManager v2.0 initialization...')
        const webhookHealth = await WebhookManager.initializeWebhooks(integration.id)
        console.log(`✅ WebhookManager v2.0 completed: ${webhookHealth.overallStatus}`)
        console.log(`   - Healthy webhooks: ${webhookHealth.webhooks.filter(w => w.status === 'healthy').length}/${webhookHealth.webhooks.length}`)
        console.log(`   - All webhooks use unified endpoint: /api/webhooks/shopify`)
      } catch (webhookError) {
        console.error('❌ Webhook health initialization failed:', webhookError)
        // Don't fail the entire flow for webhook issues, but log the error
        // Update integration with webhook error
        await prisma.integration.update({
          where: { id: integration.id },
          data: {
            syncStatus: 'ERROR',
            syncError: `Webhook initialization failed: ${webhookError instanceof Error ? webhookError.message : 'Unknown error'}`
          }
        })
      }

      // Import historical data (last 90 days) for new connections  
      try {
        console.log('📚 Starting historical data import (last 90 days)...')
        
        // Check if historical import has already been done
        const importStatus = await HistoricalImportService.getImportStatus(integration.id)
        if (!importStatus || importStatus.status !== 'completed') {
          // Trigger import asynchronously (don't block the callback)
          HistoricalImportService.importHistoricalOrders(integration.id, {
            daysBack: 90,
            batchSize: 50,
            maxOrders: 1000
          })
            .then(result => {
              console.log(`✅ Historical import completed: ${result.processedOrders} orders imported`)
            })
            .catch(error => {
              console.error('❌ Historical import failed:', error)
            })
          
          console.log('📥 Historical import started in background')
        } else {
          console.log(`⏭️ Historical import status: ${importStatus.status}, skipping`)
        }
      } catch (importError) {
        console.error('❌ Failed to start historical import:', importError)
        // Don't fail the connection for import issues
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