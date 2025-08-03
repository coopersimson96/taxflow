import { NextRequest, NextResponse } from 'next/server'
import { ShopifyService } from '@/lib/services/shopify-service'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    console.log('=== SHOPIFY APP/UNINSTALLED WEBHOOK RECEIVED ===')
    
    // Get raw body for HMAC verification
    const rawBody = await request.text()
    const hmacHeader = request.headers.get('x-shopify-hmac-sha256')
    const shop = request.headers.get('x-shopify-shop-domain')
    const topic = request.headers.get('x-shopify-topic')

    console.log('Webhook headers:', { topic, shop, hasHmac: !!hmacHeader })

    if (!hmacHeader || !shop) {
      console.error('Missing required webhook headers')
      return NextResponse.json({ error: 'Missing headers' }, { status: 400 })
    }

    // Verify webhook authenticity
    if (!ShopifyService.verifyWebhookHmac(rawBody, hmacHeader)) {
      console.error('Invalid webhook HMAC signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    console.log(' Webhook HMAC verification successful')

    // Parse app data
    const appData = JSON.parse(rawBody)
    
    console.log(`=Ñ App uninstalled from ${shop}:`, {
      appId: appData.id || 'unknown',
      domain: shop
    })

    // Find the integration
    const integration = await prisma.integration.findFirst({
      where: {
        type: 'SHOPIFY',
        credentials: {
          path: ['shop'],
          equals: shop.replace('.myshopify.com', '')
        }
      },
      include: {
        organization: true,
        transactions: {
          select: {
            id: true
          }
        }
      }
    })

    if (!integration) {
      console.error('Integration not found for shop:', shop)
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    console.log(`Found integration for ${shop}:`, {
      integrationId: integration.id,
      organizationId: integration.organizationId,
      transactionCount: integration.transactions.length
    })

    // Update integration status to disconnected
    const updatedIntegration = await prisma.integration.update({
      where: { id: integration.id },
      data: {
        status: 'DISCONNECTED',
        syncStatus: 'IDLE',
        syncError: 'App uninstalled by user',
        lastSyncAt: new Date(),
        metadata: {
          ...integration.metadata as any,
          uninstalledAt: new Date().toISOString(),
          uninstallReason: 'user_initiated'
        },
        updatedAt: new Date()
      }
    })

    console.log(` Integration marked as disconnected:`, {
      id: updatedIntegration.id,
      status: updatedIntegration.status,
      syncError: updatedIntegration.syncError
    })

    // Optionally, you might want to:
    // 1. Send notification to organization members
    // 2. Clean up webhook subscriptions (though they're automatically removed)
    // 3. Archive or mark transactions as read-only
    // 4. Create an audit log entry

    // Create a notification for the organization
    try {
      await prisma.notification.create({
        data: {
          organizationId: integration.organizationId,
          title: 'Shopify App Uninstalled',
          message: `The Shopify integration for ${shop} has been uninstalled. Tax tracking for this store has been disabled.`,
          type: 'INTEGRATION_DISCONNECTED',
          priority: 'HIGH',
          status: 'PENDING',
          metadata: {
            shop: shop,
            integrationId: integration.id,
            transactionCount: integration.transactions.length
          }
        }
      })
      console.log(' Notification created for app uninstall')
    } catch (notificationError) {
      console.error('Failed to create notification:', notificationError)
      // Don't fail the webhook for notification errors
    }

    return NextResponse.json({ 
      success: true, 
      integrationId: updatedIntegration.id,
      action: 'disconnected',
      message: 'Integration marked as disconnected due to app uninstall'
    })

  } catch (error) {
    console.error('App uninstalled webhook error:', error)
    return NextResponse.json(
      { 
        error: 'Webhook processing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}