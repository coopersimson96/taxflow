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
function generateSampleRecentPayouts(period?: string, startDate?: string, endDate?: string): PayoutItem[] {
  const payouts: PayoutItem[] = []
  const today = new Date()
  
  // Calculate date range based on period
  let rangeStartDate: Date
  let rangeEndDate: Date = new Date(today)
  
  if (startDate && endDate) {
    rangeStartDate = new Date(startDate)
    rangeEndDate = new Date(endDate)
  } else if (period === 'week') {
    rangeStartDate = new Date(today)
    rangeStartDate.setDate(today.getDate() - 7)
  } else if (period === 'month') {
    rangeStartDate = new Date(today)
    rangeStartDate.setMonth(today.getMonth() - 1)
  } else {
    // Default to last week
    rangeStartDate = new Date(today)
    rangeStartDate.setDate(today.getDate() - 7)
  }
  
  // Generate payouts within the date range
  const daysDiff = Math.ceil((rangeEndDate.getTime() - rangeStartDate.getTime()) / (1000 * 60 * 60 * 24))
  const payoutCount = Math.min(Math.max(daysDiff / 2, 3), 10) // Generate 3-10 payouts based on range
  
  for (let i = 0; i < payoutCount; i++) {
    const payoutDate = new Date(rangeStartDate)
    const dayOffset = Math.floor((daysDiff / payoutCount) * i)
    payoutDate.setDate(payoutDate.getDate() + dayOffset)
    
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
async function fetchProductionRecentPayouts(organizationId: string, period?: string, startDate?: string, endDate?: string): Promise<PayoutItem[]> {
  try {
    // Calculate date range based on period
    let rangeStartDate: Date
    let rangeEndDate: Date = new Date()
    
    if (startDate && endDate) {
      rangeStartDate = new Date(startDate)
      rangeEndDate = new Date(endDate)
    } else if (period === 'week') {
      rangeStartDate = new Date()
      rangeStartDate.setDate(rangeStartDate.getDate() - 7)
    } else if (period === 'month') {
      rangeStartDate = new Date()
      rangeStartDate.setMonth(rangeStartDate.getMonth() - 1)
    } else {
      // Default to last 30 days
      rangeStartDate = new Date()
      rangeStartDate.setDate(rangeStartDate.getDate() - 30)
    }

    const payoutStatuses = await prisma.payoutStatus.findMany({
      where: {
        organizationId,
        payoutDate: {
          gte: rangeStartDate,
          lte: rangeEndDate
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

    // Extract query parameters
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Check if we're in sample data mode
    if (process.env.USE_SAMPLE_DATA === 'true') {
      console.log('🎲 Using sample data for recent payouts')
      const data = generateSampleRecentPayouts(period || undefined, startDate || undefined, endDate || undefined)
      
      return NextResponse.json({ 
        success: true, 
        data,
        mode: 'sample',
        filter: { period, startDate, endDate }
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
    const recentPayouts = await fetchProductionRecentPayouts(organization.id, period || undefined, startDate || undefined, endDate || undefined)

    return NextResponse.json({ 
      success: true, 
      data: recentPayouts,
      mode: 'production',
      filter: { period, startDate, endDate }
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