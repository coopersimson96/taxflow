import { NextRequest, NextResponse } from 'next/server'
import { billingService } from '@/lib/services/billing-service'
import { prisma } from '@/lib/prisma'

// Force this route to be dynamic
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const chargeId = searchParams.get('charge_id')
  const shop = searchParams.get('shop')
  
  console.log('Billing callback received:', { chargeId, shop })

  if (!chargeId || !shop) {
    console.error('Missing required parameters:', { chargeId, shop })
    return NextResponse.redirect(
      `${process.env.APP_URL}/billing/error?error=missing_parameters`
    )
  }

  try {
    // Activate billing plan
    const plan = await billingService.activateBilling(shop, chargeId)
    
    console.log('Billing activated successfully:', {
      planId: plan.id,
      organizationId: plan.organizationId,
      status: plan.status
    })

    // Set up webhooks after successful billing activation
    await setupWebhooksForShop(shop)

    // Redirect to app with success message
    return NextResponse.redirect(
      `${process.env.APP_URL}/?shop=${shop}&billing=activated`
    )

  } catch (error) {
    console.error('Billing callback error:', error)
    
    // Handle different error scenarios
    if (error instanceof Error) {
      if (error.message.includes('not active')) {
        // Charge was declined
        return NextResponse.redirect(
          `${process.env.APP_URL}/billing/declined?shop=${shop}`
        )
      }
      
      if (error.message.includes('not found')) {
        // Billing plan not found
        return NextResponse.redirect(
          `${process.env.APP_URL}/billing/error?shop=${shop}&error=plan_not_found`
        )
      }
    }
    
    // Generic error
    return NextResponse.redirect(
      `${process.env.APP_URL}/billing/error?shop=${shop}&error=${encodeURIComponent(
        error instanceof Error ? error.message : 'activation_failed'
      )}`
    )
  }
}

/**
 * Set up required webhooks after billing activation
 */
async function setupWebhooksForShop(shop: string) {
  try {
    // Find the integration
    const integration = await prisma.integration.findFirst({
      where: {
        type: 'SHOPIFY',
        config: {
          path: ['shop'],
          equals: shop
        }
      }
    })

    if (!integration) {
      console.error('Integration not found for webhook setup:', shop)
      return
    }

    // Import webhook manager
    const { WebhookManager } = await import('@/lib/services/webhook-manager')
    const webhookManager = new WebhookManager()
    
    // Set up webhooks
    await webhookManager.setupWebhooks(integration.id)
    
    console.log('Webhooks set up successfully for shop:', shop)
    
  } catch (error) {
    console.error('Failed to set up webhooks after billing activation:', error)
    // Don't throw error - billing activation should still succeed
  }
}