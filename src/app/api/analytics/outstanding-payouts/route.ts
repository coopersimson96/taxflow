import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { sampleDataStore } from '@/lib/sample-data-store'

// Force this route to be dynamic
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const month = parseInt(searchParams.get('month') || '')
    const year = parseInt(searchParams.get('year') || '')

    if (!month || !year || month < 1 || month > 12) {
      return NextResponse.json({ 
        error: 'Invalid month or year parameters' 
      }, { status: 400 })
    }

    // Check if we're in sample data mode
    if (process.env.USE_SAMPLE_DATA === 'true') {
      console.log(`🎲 Getting outstanding payouts for ${month}/${year}`)
      
      const outstandingPayouts = sampleDataStore.getOutstandingPayouts(month, year)
      
      // Transform to match the expected interface
      const payouts = outstandingPayouts.map(payout => ({
        id: payout.id,
        date: payout.date,
        amount: payout.amount,
        taxAmount: payout.taxAmount,
        currency: payout.currency,
        orderCount: payout.orderCount,
        displayDate: new Date(payout.date).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        })
      }))
      
      const totalOutstanding = outstandingPayouts.reduce((sum, payout) => sum + payout.taxAmount, 0)
      
      return NextResponse.json({ 
        success: true, 
        data: {
          payouts,
          totalOutstanding,
          currency: outstandingPayouts[0]?.currency || 'USD',
          count: outstandingPayouts.length,
          monthYear: new Date(year, month - 1).toLocaleDateString('en-US', { 
            month: 'long', 
            year: 'numeric' 
          })
        },
        mode: 'sample'
      })
    }

    // PRODUCTION MODE: Would fetch from database
    // For now, return empty data
    return NextResponse.json({ 
      success: true, 
      data: {
        payouts: [],
        totalOutstanding: 0,
        currency: 'USD',
        count: 0,
        monthYear: new Date(year, month - 1).toLocaleDateString('en-US', { 
          month: 'long', 
          year: 'numeric' 
        })
      },
      mode: 'production',
      message: 'Production mode - would fetch from database'
    })

  } catch (error) {
    console.error('Outstanding payouts API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}