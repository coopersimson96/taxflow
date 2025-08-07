import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ShopifyService } from '@/lib/services/shopify-service'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    console.log('Starting webhook cleanup...')
    
    // Find connected Shopify integration
    const integration = await prisma.integration.findFirst({
      where: {
        type: 'SHOPIFY',
        status: 'CONNECTED'
      }
    })

    if (!integration) {
      return NextResponse.json({
        success: false,
        error: 'No connected Shopify integration found'
      })
    }

    const credentials = integration.credentials as any
    const shop = credentials?.shop
    const accessToken = credentials?.accessToken

    if (!shop || !accessToken) {
      return NextResponse.json({
        success: false,
        error: 'Missing shop or access token'
      })
    }

    console.log(`Cleaning up webhooks for shop: ${shop}`)

    // List existing webhooks
    const webhooks = await ShopifyService.listWebhooks(shop, accessToken)
    const existingWebhooks = webhooks.webhooks || []
    
    console.log(`Found ${existingWebhooks.length} existing webhooks`)

    // Delete all existing webhooks
    const deletedWebhooks = []
    for (const webhook of existingWebhooks) {
      try {
        await ShopifyService.deleteWebhook(shop, accessToken, webhook.id)
        deletedWebhooks.push({
          id: webhook.id,
          topic: webhook.topic,
          address: webhook.address
        })
        console.log(`✅ Deleted webhook: ${webhook.topic} (${webhook.id})`)
      } catch (deleteError) {
        console.error(`❌ Failed to delete webhook ${webhook.id}:`, deleteError)
      }
    }

    // Now create new webhooks with unified endpoint
    const baseUrl = process.env.NEXTAUTH_URL || 'https://taxflow-smoky.vercel.app'
    const webhookTopics = [
      'orders/create',
      'orders/updated',
      'orders/cancelled',
      'orders/refunded',
      'app/uninstalled'
    ]

    const createdWebhooks = []
    for (const topic of webhookTopics) {
      try {
        const address = `${baseUrl}/api/webhooks/shopify`
        const result = await ShopifyService.createWebhook(shop, accessToken, topic, address)
        createdWebhooks.push({
          topic,
          address,
          id: result.webhook.id
        })
        console.log(`✅ Created new webhook: ${topic} -> ${address}`)
      } catch (createError) {
        console.error(`❌ Failed to create webhook for ${topic}:`, createError)
      }
    }

    return NextResponse.json({
      success: true,
      shop: shop,
      deletedWebhooks: deletedWebhooks,
      createdWebhooks: createdWebhooks,
      message: `Cleaned up ${deletedWebhooks.length} old webhooks and created ${createdWebhooks.length} new ones`,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Webhook cleanup error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}