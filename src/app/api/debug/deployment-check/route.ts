import { NextRequest, NextResponse } from 'next/server'
import { WebhookManager } from '@/lib/services/webhook-manager'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      message: 'Deployment Check v3.0 - WebhookManager system active',
      timestamp: new Date().toISOString(),
      webhookSystemVersion: '3.0',
      unifiedEndpoint: '/api/webhooks/shopify',
      webhookManagerAvailable: !!WebhookManager,
      requiredWebhooks: [
        'orders/create',
        'orders/updated', 
        'orders/cancelled',
        'refunds/create',
        'app/uninstalled'
      ],
      deploymentInfo: {
        nodeEnv: process.env.NODE_ENV,
        nextAuthUrl: process.env.NEXTAUTH_URL,
        hasShopifyApiKey: !!process.env.SHOPIFY_API_KEY,
        hasShopifySecret: !!process.env.SHOPIFY_API_SECRET,
        hasWebhookSecret: !!process.env.SHOPIFY_WEBHOOK_SECRET
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}