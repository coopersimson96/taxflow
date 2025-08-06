import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ShopifyService } from '@/lib/services/shopify-service'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    console.log('Checking webhook URLs...')
    // Find a connected Shopify integration
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
        error: 'Missing shop or access token in integration'
      })
    }

    // List existing webhooks from Shopify
    const webhooks = await ShopifyService.listWebhooks(shop, accessToken)
    
    const webhookInfo = webhooks.webhooks?.map((webhook: any) => ({
      id: webhook.id,
      topic: webhook.topic,
      address: webhook.address,
      format: webhook.format,
      created_at: webhook.created_at,
      updated_at: webhook.updated_at
    })) || []

    // Show what URLs we would generate
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const expectedUrls = [
      'orders/create',
      'orders/updated', 
      'orders/cancelled',
      'orders/refunded',
      'app/uninstalled'
    ].map(topic => ({
      topic,
      expectedUrl: `${baseUrl}/api/shopify/webhooks/${topic.replace('/', '-')}`,
      actualWebhook: webhookInfo.find(w => w.topic === topic)
    }))

    return NextResponse.json({
      success: true,
      shop: shop,
      baseUrl: baseUrl,
      existingWebhooks: webhookInfo,
      expectedUrls: expectedUrls,
      webhookCount: webhookInfo.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Webhook URLs debug error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}