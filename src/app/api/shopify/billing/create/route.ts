import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { billingService } from '@/lib/services/billing-service'
import { prisma } from '@/lib/prisma'

// Force this route to be dynamic
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { shop } = await request.json()
    
    if (!shop) {
      return NextResponse.json({ 
        error: 'Shop parameter is required' 
      }, { status: 400 })
    }

    // Find organization for this shop
    const integration = await prisma.integration.findFirst({
      where: {
        type: 'SHOPIFY',
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

    // Check if already has active billing
    const existingPlan = await billingService.getActivePlan(integration.organization.id)
    if (existingPlan?.status === 'ACTIVE') {
      return NextResponse.json({ 
        error: 'Already has active billing',
        redirectUrl: `/?shop=${shop}&billing=active`
      }, { status: 400 })
    }

    // Create billing and get confirmation URL
    const confirmationUrl = await billingService.initiateBilling(
      shop, 
      integration.organization.id
    )

    return NextResponse.json({
      success: true,
      confirmationUrl,
      message: 'Billing charge created successfully'
    })

  } catch (error) {
    console.error('Billing creation error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to create billing charge',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET method for direct access from browser
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const shop = searchParams.get('shop')
  
  if (!shop) {
    return NextResponse.json({ 
      error: 'Shop parameter is required' 
    }, { status: 400 })
  }

  try {
    // Find organization for this shop
    const integration = await prisma.integration.findFirst({
      where: {
        type: 'SHOPIFY',
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

    // Create billing and redirect to confirmation URL
    const confirmationUrl = await billingService.initiateBilling(
      shop, 
      integration.organization.id
    )

    // Redirect to Shopify billing page
    return NextResponse.redirect(confirmationUrl)

  } catch (error) {
    console.error('Billing creation error:', error)
    
    // Redirect to error page
    return NextResponse.redirect(
      `${process.env.APP_URL}/billing/error?shop=${shop}&error=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`
    )
  }
}