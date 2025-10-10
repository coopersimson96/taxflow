import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Force this route to be dynamic
export const dynamic = 'force-dynamic'

interface TaxBreakdown {
  type: string
  amount: number
  percentage: number
  color: string
}

interface OrderDetail {
  id: string
  orderNumber: string
  timestamp: string
  customerName: string
  orderTotal: number
  taxCollected: number
  taxBreakdown: TaxBreakdown[]
}

interface PayoutItem {
  id: string
  date: string
  amount: number
  currency: string
  taxAmount: number
  isSetAside: boolean
  orderCount: number
  orders?: OrderDetail[]
}

/**
 * Generates sample recent payouts data for development
 */
function generateSampleRecentPayouts(): PayoutItem[] {
  const payouts: PayoutItem[] = []
  const today = new Date()
  
  for (let i = 0; i < 5; i++) {
    const payoutDate = new Date(today)
    payoutDate.setDate(payoutDate.getDate() - i)
    
    const seed = payoutDate.getDate() + i
    const baseAmount = 1000 + (seed * 123) % 2000
    const taxRate = 0.08 + ((seed * 0.01) % 0.04)
    const taxAmount = Math.round(baseAmount * taxRate * 100) / 100
    const orderCount = 3 + (seed % 8)
    
    // Vary set aside status
    const isSetAside = i === 0 ? false : Math.random() > 0.4
    
    payouts.push({
      id: `sample_payout_${i}`,
      date: payoutDate.toISOString(),
      amount: Math.round(baseAmount * 100) / 100,
      currency: 'USD',
      taxAmount,
      isSetAside,
      orderCount,
      orders: [] // Orders loaded lazily when expanded
    })
  }
  
  return payouts
}

/**
 * Fetches recent payouts from database for production
 */
async function fetchProductionRecentPayouts(organizationId: string): Promise<PayoutItem[]> {
  try {
    // Get recent payout statuses from the last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const payoutStatuses = await prisma.payoutStatus.findMany({
      where: {
        organizationId,
        payoutDate: {
          gte: thirtyDaysAgo
        }
      },
      orderBy: {
        payoutDate: 'desc'
      },
      take: 5
    })

    return payoutStatuses.map(status => ({
      id: status.id,
      date: status.payoutDate.toISOString(),
      amount: status.payoutAmount,
      currency: 'USD', // Could be stored in payout status
      taxAmount: status.taxAmount,
      isSetAside: status.isSetAside,
      orderCount: 0, // Would need to calculate from associated orders
      orders: [] // Orders loaded lazily when expanded
    }))

  } catch (error) {
    console.error('Error fetching production recent payouts:', error)
    return []
  }
}

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if we're in sample data mode
    if (process.env.USE_SAMPLE_DATA === 'true') {
      console.log('🎲 Using sample data for recent payouts')
      const data = generateSampleRecentPayouts()
      
      return NextResponse.json({ 
        success: true, 
        data,
        mode: 'sample'
      })
    }

    // PRODUCTION MODE: Find user's organization
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        organizations: {
          include: {
            organization: true
          }
        }
      }
    })

    const organization = user?.organizations?.[0]?.organization

    if (!organization) {
      return NextResponse.json({ 
        success: true, 
        data: [],
        mode: 'production',
        message: 'No organization found'
      })
    }

    // Fetch production recent payouts data
    const recentPayouts = await fetchProductionRecentPayouts(organization.id)

    return NextResponse.json({ 
      success: true, 
      data: recentPayouts,
      mode: 'production'
    })

  } catch (error) {
    console.error('Recent payouts API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, payoutId } = await request.json()
    
    if (!action || !payoutId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate action
    if (action !== 'set_aside') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // In sample mode, just return success
    if (process.env.USE_SAMPLE_DATA === 'true') {
      console.log('🎲 Sample mode: simulating payout set aside update')
      return NextResponse.json({ 
        success: true, 
        action,
        payoutId,
        timestamp: new Date().toISOString(),
        mode: 'sample'
      })
    }

    // PRODUCTION MODE: Update database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        organizations: {
          include: {
            organization: true
          }
        }
      }
    })

    if (!user?.organizations?.[0]?.organization) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    const organization = user.organizations[0].organization
    
    // Update the payout status
    await prisma.payoutStatus.update({
      where: {
        id: payoutId,
        organizationId: organization.id
      },
      data: {
        isSetAside: true,
        setAsideAt: new Date(),
        setAsideBy: session.user.email
      }
    })
    
    return NextResponse.json({ 
      success: true, 
      action,
      payoutId,
      timestamp: new Date().toISOString(),
      mode: 'production'
    })

  } catch (error) {
    console.error('Payout set aside error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}