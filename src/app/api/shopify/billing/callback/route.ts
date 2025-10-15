import { NextRequest, NextResponse } from 'next/server'
import { BillingService } from '@/lib/services/billing-service'
import { ShopifyService } from '@/lib/services/shopify-service'
import { WebhookManager } from '@/lib/services/webhook-manager'
import { prisma } from '@/lib/prisma'

// Force this route to be dynamic
export const dynamic = 'force-dynamic'

/**
 * GET /api/shopify/billing/callback
 *
 * SECURITY: Shopify billing confirmation callback
 *
 * This endpoint is called by Shopify after merchant confirms/declines billing
 *
 * Security measures:
 * 1. Validates charge_id format
 * 2. Validates shop domain
 * 3. Verifies charge status directly with Shopify API (prevents fake charge_id)
 * 4. Cross-checks charge belongs to the shop making the callback
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const chargeId = searchParams.get('charge_id')
  const shop = searchParams.get('shop')

  console.log('📋 Billing callback received:', {
    chargeId: chargeId?.substring(0, 50),
    shop
  })

  // SECURITY: Validate required parameters
  if (!chargeId || !shop) {
    console.error('❌ Missing required parameters')
    return NextResponse.redirect(
      `${process.env.APP_URL}/billing/error?error=missing_parameters`
    )
  }

  try {
    // SECURITY: Validate shop domain format
    const normalizedShop = ShopifyService.normalizeShopDomain(shop)
    if (!ShopifyService.validateShopDomain(normalizedShop)) {
      console.error('❌ Invalid shop domain:', shop)
      return NextResponse.redirect(
        `${process.env.APP_URL}/billing/error?error=invalid_shop`
      )
    }

    // SECURITY: Activate billing (this verifies the charge with Shopify)
    // The BillingService.activateBilling method:
    // 1. Validates charge_id format
    // 2. Calls Shopify API to verify charge is ACTIVE
    // 3. Verifies charge belongs to the organization
    // 4. Only then activates billing
    const plan = await BillingService.activateBilling(normalizedShop, chargeId)

    console.log('✅ Billing activated successfully:', {
      planId: plan.id,
      organizationId: plan.organizationId,
      status: plan.status
    })

    // Initialize webhooks after successful billing
    await initializeWebhooksForShop(normalizedShop)

    // Redirect to app with success
    return NextResponse.redirect(
      `${process.env.APP_URL}/?shop=${normalizedShop}&billing=activated`
    )

  } catch (error) {
    console.error('❌ Billing callback error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Handle specific error cases
    if (errorMessage.includes('not active') || errorMessage.includes('not ACTIVE')) {
      return NextResponse.redirect(
        `${process.env.APP_URL}/billing/declined?shop=${shop}`
      )
    }

    if (errorMessage.includes('not found')) {
      return NextResponse.redirect(
        `${process.env.APP_URL}/billing/error?shop=${shop}&error=plan_not_found`
      )
    }

    if (errorMessage.includes('Invalid')) {
      return NextResponse.redirect(
        `${process.env.APP_URL}/billing/error?shop=${shop}&error=invalid_request`
      )
    }

    // Generic error (don't leak details)
    return NextResponse.redirect(
      `${process.env.APP_URL}/billing/error?shop=${shop}&error=activation_failed`
    )
  }
}

/**
 * Initialize webhooks after successful billing activation
 */
async function initializeWebhooksForShop(shop: string): Promise<void> {
  try {
    const integration = await prisma.integration.findFirst({
      where: {
        type: 'SHOPIFY',
        status: 'CONNECTED',
        config: {
          path: ['shop'],
          equals: shop
        }
      },
      select: {
        id: true
      }
    })

    if (!integration) {
      console.error('⚠️ Integration not found for webhook setup:', shop)
      return
    }

    // Use static method from WebhookManager
    await WebhookManager.initializeWebhooks(integration.id)

    console.log('✅ Webhooks initialized for shop:', shop)

  } catch (error) {
    console.error('⚠️ Failed to initialize webhooks (non-fatal):', error)
    // Don't throw - billing activation should still succeed
  }
}
