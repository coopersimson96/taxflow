import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sampleDataStore } from '@/lib/sample-data-store'
import { withAnalyticsBilling } from '@/lib/middleware/with-billing'

// Force this route to be dynamic
export const dynamic = 'force-dynamic'

interface MonthlyTrackingData {
  month: string
  year: number
  totalTaxToTrack: number
  totalSetAside: number
  totalRemaining: number
  currency: string
  payoutCount: number
  averagePerPayout: number
  completionPercentage: number
}

// Note: generateSampleMonthlyTracking function removed - now using shared store

/**
 * Fetches monthly tracking data from database for production
 */
async function fetchProductionMonthlyTracking(
  organizationId: string, 
  month: number, 
  year: number
): Promise<MonthlyTrackingData | null> {
  try {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]

    // Calculate start and end dates for the month
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59, 999)

    // Fetch payout statuses for this month
    const payoutStatuses = await prisma.payoutStatus.findMany({
      where: {
        organizationId,
        payoutDate: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    if (payoutStatuses.length === 0) {
      return {
        month: monthNames[month - 1],
        year,
        totalTaxToTrack: 0,
        totalSetAside: 0,
        totalRemaining: 0,
        currency: 'USD',
        payoutCount: 0,
        averagePerPayout: 0,
        completionPercentage: 0
      }
    }

    // Calculate totals
    const totalTaxToTrack = payoutStatuses.reduce((sum, status) => sum + status.taxAmount, 0)
    const totalSetAside = payoutStatuses
      .filter(status => status.isSetAside)
      .reduce((sum, status) => sum + status.taxAmount, 0)
    const totalRemaining = totalTaxToTrack - totalSetAside
    const payoutCount = payoutStatuses.length
    const averagePerPayout = payoutCount > 0 ? 
      payoutStatuses.reduce((sum, status) => sum + status.payoutAmount, 0) / payoutCount : 0
    const completionPercentage = totalTaxToTrack > 0 ? 
      (totalSetAside / totalTaxToTrack) * 100 : 0

    return {
      month: monthNames[month - 1],
      year,
      totalTaxToTrack: Math.round(totalTaxToTrack * 100) / 100,
      totalSetAside: Math.round(totalSetAside * 100) / 100,
      totalRemaining: Math.round(totalRemaining * 100) / 100,
      currency: 'USD', // Could be determined from payout data
      payoutCount,
      averagePerPayout: Math.round(averagePerPayout * 100) / 100,
      completionPercentage: Math.round(completionPercentage * 100) / 100
    }

  } catch (error) {
    console.error('Error fetching production monthly tracking:', error)
    return null
  }
}

async function getMonthlyTracking(request: NextRequest) {
  try {
    // SECURITY: Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const month = parseInt(searchParams.get('month') || '0')
    const year = parseInt(searchParams.get('year') || '0')
    const currentDate = new Date()
    const targetMonth = month || (currentDate.getMonth() + 1)
    const targetYear = year || currentDate.getFullYear()

    // Validate month/year
    if (targetMonth < 1 || targetMonth > 12 || targetYear < 2020 || targetYear > 2030) {
      return NextResponse.json({ error: 'Invalid month or year' }, { status: 400 })
    }

    // Check if we're in sample data mode
    if (process.env.USE_SAMPLE_DATA === 'true') {
      console.log('🎲 Using sample data for monthly tracking')
      const data = sampleDataStore.getMonthlyTracking(targetMonth, targetYear)
      
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
        data: {
          month: new Date(targetYear, targetMonth - 1).toLocaleDateString('en-US', { month: 'long' }),
          year: targetYear,
          totalTaxToTrack: 0,
          totalSetAside: 0,
          totalRemaining: 0,
          currency: 'USD',
          payoutCount: 0,
          averagePerPayout: 0,
          completionPercentage: 0
        },
        mode: 'production',
        message: 'No organization found'
      })
    }

    // Fetch production monthly tracking data
    const monthlyData = await fetchProductionMonthlyTracking(organization.id, targetMonth, targetYear)
    
    if (!monthlyData) {
      return NextResponse.json({ 
        success: true, 
        data: {
          month: new Date(targetYear, targetMonth - 1).toLocaleDateString('en-US', { month: 'long' }),
          year: targetYear,
          totalTaxToTrack: 0,
          totalSetAside: 0,
          totalRemaining: 0,
          currency: 'USD',
          payoutCount: 0,
          averagePerPayout: 0,
          completionPercentage: 0
        },
        mode: 'production'
      })
    }

    return NextResponse.json({ 
      success: true, 
      data: monthlyData,
      mode: 'production'
    })

  } catch (error) {
    console.error('Monthly tracking API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Export wrapped handler with billing enforcement
export const GET = withAnalyticsBilling(getMonthlyTracking)