import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { BillingService } from '@/lib/services/billing-service'
import { prisma } from '@/lib/prisma'
import { rateLimit, RateLimitPresets } from '@/lib/middleware/rate-limit'

// Force this route to be dynamic
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // SECURITY: Rate limiting
    const rateLimitResult = rateLimit(request, RateLimitPresets.READ, session)
    if (rateLimitResult) {
      return rateLimitResult
    }

    const { searchParams } = new URL(request.url)
    const shop = searchParams.get('shop')
    
    if (!shop) {
      return NextResponse.json({ 
        error: 'Shop parameter is required' 
      }, { status: 400 })
    }

    // Find organization for this shop
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
        organization: true
      }
    })

    if (!integration?.organization) {
      return NextResponse.json({ 
        error: 'Organization not found for shop' 
      }, { status: 404 })
    }

    // Get billing plan and current usage
    const [plan, usage] = await Promise.all([
      BillingService.getActivePlan(integration.organization.id),
      BillingService.getCurrentUsage(integration.organization.id)
    ])

    if (!plan) {
      return NextResponse.json({
        success: true,
        data: {
          hasActiveBilling: false,
          status: null,
          requiresBilling: true
        }
      })
    }

    const response = {
      hasActiveBilling: plan.status === 'ACTIVE',
      status: plan.status,
      requiresBilling: plan.status !== 'ACTIVE',
      plan: {
        id: plan.id,
        baseFee: plan.baseFee,
        usageRate: plan.usageRate,
        currency: plan.currency,
        billingStartDate: plan.billingStartDate,
        billingEndDate: plan.billingEndDate,
        activatedAt: plan.activatedAt
      },
      usage: usage ? {
        transactionCount: usage.transactionCount,
        transactionVolume: usage.transactionVolume,
        taxCalculated: usage.taxCalculated,
        usageFee: usage.usageFee,
        projectedTotal: plan.baseFee + usage.usageFee
      } : null
    }

    return NextResponse.json({
      success: true,
      data: response
    })

  } catch (error) {
    console.error('Billing status error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to get billing status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}