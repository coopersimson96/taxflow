import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { BillingService } from '@/lib/services/billing-service'
import { verifyUserOwnsShop } from '@/lib/auth/authorization'
import { ShopifyService } from '@/lib/services/shopify-service'
import { rateLimit, RateLimitPresets } from '@/lib/middleware/rate-limit'

// Force this route to be dynamic
export const dynamic = 'force-dynamic'

/**
 * POST /api/shopify/billing/create
 *
 * SECURITY: Create billing subscription (authenticated)
 * - Requires valid session
 * - Validates user owns the shop
 * - Validates shop domain format
 * - Rate limited to prevent abuse
 */
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Require authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // SECURITY: Rate limiting
    const rateLimitResult = rateLimit(request, RateLimitPresets.BILLING, session)
    if (rateLimitResult) {
      return rateLimitResult
    }

    // Parse and validate input
    const body = await request.json()
    const shop = body?.shop

    if (!shop || typeof shop !== 'string') {
      return NextResponse.json(
        { error: 'Shop parameter is required' },
        { status: 400 }
      )
    }

    // SECURITY: Validate shop domain format
    const normalizedShop = ShopifyService.normalizeShopDomain(shop)
    if (!ShopifyService.validateShopDomain(normalizedShop)) {
      return NextResponse.json(
        { error: 'Invalid shop domain format' },
        { status: 400 }
      )
    }

    // SECURITY: Verify user owns this shop
    const shopAuth = await verifyUserOwnsShop(session.user.email, normalizedShop)
    if (!shopAuth.authorized || !shopAuth.organizationId) {
      return NextResponse.json(
        { error: 'Access denied: Shop not found or not authorized' },
        { status: 403 }
      )
    }

    // Check if already has active billing
    const existingPlan = await BillingService.getActivePlan(shopAuth.organizationId)
    if (existingPlan?.status === 'ACTIVE') {
      return NextResponse.json(
        {
          error: 'Organization already has active billing',
          redirectUrl: `/?shop=${normalizedShop}&billing=active`
        },
        { status: 400 }
      )
    }

    // Create billing subscription
    const confirmationUrl = await BillingService.initiateBilling(
      normalizedShop,
      shopAuth.organizationId
    )

    return NextResponse.json({
      success: true,
      confirmationUrl,
      message: 'Billing charge created successfully'
    })

  } catch (error) {
    console.error('Billing creation error:', error)

    // Don't leak internal error details
    const message = error instanceof Error ? error.message : 'Unknown error'
    const safeMessage = message.includes('Shop does not belong')
      ? 'Access denied'
      : 'Failed to create billing charge'

    return NextResponse.json(
      { error: safeMessage },
      { status: 500 }
    )
  }
}

/**
 * GET /api/shopify/billing/create
 *
 * SECURITY: This endpoint should NOT exist in production
 * Removing it prevents unauthenticated billing creation
 *
 * If needed, merchants should use the POST endpoint from authenticated context
 */
export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      error: 'Method not allowed. Use POST with authentication.',
      hint: 'This endpoint requires authentication to prevent unauthorized billing charges.'
    },
    { status: 405 }
  )
}
