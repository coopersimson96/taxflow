import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { withWebhookDb } from '@/lib/prisma'
import { getStoreTimezone, getStoreDayRange } from '@/lib/utils/timezone'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { integrationId } = await request.json()

    if (!integrationId) {
      return NextResponse.json({ error: 'Integration ID required' }, { status: 400 })
    }

    // Get the integration
    const integration = await withWebhookDb(async (db) => {
      return await db.integration.findUnique({
        where: { id: integrationId },
        include: {
          organization: {
            include: {
              members: {
                where: {
                  user: {
                    email: session.user.email!
                  }
                }
              }
            }
          }
        }
      })
    })

    if (!integration || integration.organization.members.length === 0) {
      return NextResponse.json({ error: 'Integration not found or access denied' }, { status: 404 })
    }

    // Get some sample transactions to analyze date ranges
    const transactions = await withWebhookDb(async (db) => {
      return await db.transaction.findMany({
        where: {
          organizationId: integration.organizationId,
          integrationId: integration.id
        },
        orderBy: {
          transactionDate: 'desc'
        },
        take: 50
      })
    })

    // Get store timezone
    const storeTimezone = getStoreTimezone(integration)
    const now = new Date()
    
    // Calculate "today" in store timezone
    const todayRange = getStoreDayRange(now, storeTimezone)
    const todayStartUTC = todayRange.startUTC
    const todayEndUTC = todayRange.endUTC
    
    const todayTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.transactionDate)
      return txDate >= todayStartUTC && txDate < todayEndUTC
    })

    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const last7DaysTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.transactionDate)
      return txDate >= last7Days
    })

    // Calculate today's totals (our app method)
    const todayTotalSales = todayTransactions.reduce((sum, tx) => sum + tx.totalAmount, 0) / 100
    const todayTaxAmount = todayTransactions.reduce((sum, tx) => sum + tx.taxAmount, 0) / 100
    const todayPayoutAmount = todayTransactions.reduce((sum, tx) => sum + (tx.totalAmount - tx.taxAmount), 0) / 100

    // Get sample transaction dates for comparison
    const sampleDates = transactions.slice(0, 10).map(tx => ({
      id: tx.externalId,
      orderNumber: tx.orderNumber,
      transactionDate: tx.transactionDate,
      totalAmount: tx.totalAmount / 100,
      taxAmount: tx.taxAmount / 100
    }))

    return NextResponse.json({
      success: true,
      analysis: {
        serverTime: now.toISOString(),
        serverTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        todayRange: {
          start: todayStartUTC.toISOString(),
          end: todayEndUTC.toISOString(),
          localStart: todayRange.startLocal.toISOString(),
          localEnd: todayRange.endLocal.toISOString(),
          storeTimezone: storeTimezone
        },
        last7DaysStart: last7Days.toISOString(),
        
        // Transaction counts
        totalTransactions: transactions.length,
        todayTransactionCount: todayTransactions.length,
        last7DaysTransactionCount: last7DaysTransactions.length,
        
        // Today's calculations (our method)
        todayCalculations: {
          totalSales: todayTotalSales,
          taxAmount: todayTaxAmount,
          payoutAmount: todayPayoutAmount,
          method: 'Based on order transaction dates'
        },
        
        // Sample transaction dates for debugging
        sampleTransactionDates: sampleDates,
        
        // Date range of all transactions
        dateRange: {
          oldest: transactions.length > 0 ? new Date(Math.min(...transactions.map(tx => new Date(tx.transactionDate).getTime()))).toISOString() : null,
          newest: transactions.length > 0 ? new Date(Math.max(...transactions.map(tx => new Date(tx.transactionDate).getTime()))).toISOString() : null
        },
        
        recommendations: [
          'Check if Shopify is reporting in different timezone',
          'Verify if Shopify "today" means settlement date vs order date',
          'Compare with Shopify Analytics date ranges',
          'Check if weekends/holidays affect payout calculations'
        ]
      }
    })

  } catch (error) {
    console.error('Debug reporting windows error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to debug reporting windows',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}