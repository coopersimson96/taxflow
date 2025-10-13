import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sampleDataStore } from '@/lib/sample-data-store'

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

// Note: generateSampleRecentPayouts function removed - now using shared store

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
      const allPayouts = sampleDataStore.getRecentPayouts()
      
      // Filter payouts based on period parameters
      let filteredPayouts = allPayouts
      
      if (period || startDate || endDate) {
        const today = new Date()
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
          rangeStartDate = new Date(today)
          rangeStartDate.setDate(today.getDate() - 7)
        }
        
        filteredPayouts = allPayouts.filter(payout => {
          const payoutDate = new Date(payout.date)
          return payoutDate >= rangeStartDate && payoutDate <= rangeEndDate
        })
      }
      
      return NextResponse.json({ 
        success: true, 
        data: filteredPayouts,
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

    // In sample mode, update the shared store
    if (process.env.USE_SAMPLE_DATA === 'true') {
      console.log('🎲 Sample mode: updating payout status in shared store')
      const success = sampleDataStore.setPayoutAsAside(payoutId)
      
      return NextResponse.json({ 
        success,
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