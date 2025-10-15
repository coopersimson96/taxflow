import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export interface BillingCheckResult {
  hasAccess: boolean
  billingStatus: 'ACTIVE' | 'PENDING' | 'CANCELLED' | 'EXPIRED' | 'NOT_FOUND'
  organizationId?: string
  redirectUrl?: string
}

/**
 * Check if a shop has active billing
 */
export async function checkBillingAccess(shop: string): Promise<BillingCheckResult> {
  try {
    // Find the integration for this shop
    const integration = await prisma.integration.findFirst({
      where: {
        type: 'SHOPIFY',
        status: 'CONNECTED',
        config: {
          path: ['shop'],
          equals: shop
        }
      },
      include: {
        organization: {
          include: {
            billingPlan: true
          }
        }
      }
    })

    if (!integration?.organization) {
      return {
        hasAccess: false,
        billingStatus: 'NOT_FOUND',
        redirectUrl: `/connect?shop=${shop}`
      }
    }

    const billingPlan = integration.organization.billingPlan

    if (!billingPlan) {
      return {
        hasAccess: false,
        billingStatus: 'NOT_FOUND',
        organizationId: integration.organization.id,
        redirectUrl: `/api/shopify/billing/create?shop=${shop}`
      }
    }

    // Check billing status
    switch (billingPlan.status) {
      case 'ACTIVE':
        return {
          hasAccess: true,
          billingStatus: 'ACTIVE',
          organizationId: integration.organization.id
        }
      
      case 'PENDING':
        return {
          hasAccess: false,
          billingStatus: 'PENDING',
          organizationId: integration.organization.id,
          redirectUrl: `/billing/pending?shop=${shop}`
        }
      
      case 'CANCELLED':
        return {
          hasAccess: false,
          billingStatus: 'CANCELLED',
          organizationId: integration.organization.id,
          redirectUrl: `/billing/reactivate?shop=${shop}`
        }
      
      case 'EXPIRED':
        return {
          hasAccess: false,
          billingStatus: 'EXPIRED',
          organizationId: integration.organization.id,
          redirectUrl: `/billing/expired?shop=${shop}`
        }
      
      default:
        return {
          hasAccess: false,
          billingStatus: 'NOT_FOUND',
          organizationId: integration.organization.id,
          redirectUrl: `/api/shopify/billing/create?shop=${shop}`
        }
    }
  } catch (error) {
    console.error('Billing check error:', error)
    return {
      hasAccess: false,
      billingStatus: 'NOT_FOUND',
      redirectUrl: `/billing/error?shop=${shop}&error=check_failed`
    }
  }
}

/**
 * Middleware function to enforce billing for API routes
 */
export async function requireActiveBilling(
  request: NextRequest,
  getShop: (request: NextRequest) => string | null
): Promise<NextResponse | null> {
  const shop = getShop(request)
  
  if (!shop) {
    return NextResponse.json(
      { error: 'Shop parameter is required' },
      { status: 400 }
    )
  }

  const billingCheck = await checkBillingAccess(shop)
  
  if (!billingCheck.hasAccess) {
    return NextResponse.json(
      { 
        error: 'Active subscription required',
        billingStatus: billingCheck.billingStatus,
        redirectUrl: billingCheck.redirectUrl
      },
      { status: 402 } // Payment Required
    )
  }

  // Add billing info to request headers for downstream use
  const response = NextResponse.next()
  response.headers.set('x-billing-status', billingCheck.billingStatus)
  response.headers.set('x-organization-id', billingCheck.organizationId || '')
  
  return null // Continue to the route
}

/**
 * Extract shop domain from various sources in the request
 */
export function extractShopFromRequest(request: NextRequest): string | null {
  // Priority 1: Query parameter
  const shopFromQuery = request.nextUrl.searchParams.get('shop')
  if (shopFromQuery) return shopFromQuery

  // Priority 2: Header (for embedded app requests)
  const shopFromHeader = request.headers.get('x-shopify-shop-domain')
  if (shopFromHeader) return shopFromHeader

  // SECURITY NOTE: Priority 3 removed - JWT parsing without signature verification
  // is a security vulnerability. If Shopify session tokens are needed,
  // implement proper JWT verification with Shopify's public key.
  // For now, rely on query params and headers from authenticated contexts.

  // Priority 3: Referer header (fallback only)
  const referer = request.headers.get('referer')
  if (referer) {
    const match = referer.match(/[?&]shop=([^&]+)/)
    if (match) return decodeURIComponent(match[1])
  }

  return null
}