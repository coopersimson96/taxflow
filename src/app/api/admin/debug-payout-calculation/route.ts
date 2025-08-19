import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { withWebhookDb } from '@/lib/prisma'
import { getStoreTimezone, getStoreDayRange } from '@/lib/utils/timezone'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const user = await withWebhookDb(async (db) => {
      return await db.user.findUnique({
        where: { email: session.user.email! },
        include: {
          organizations: {
            include: {
              organization: {
                include: {
                  integrations: {
                    where: {
                      type: 'SHOPIFY',
                      status: 'CONNECTED'
                    }
                  }
                }
              }
            }
          }
        }
      })
    })

    if (!user?.organizations?.[0]) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    const organizationId = user.organizations[0].organizationId
    const integration = user.organizations[0].organization.integrations[0]

    // Get transactions from last 7 days
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - (7 * 24 * 60 * 60 * 1000))

    const transactions = await withWebhookDb(async (db) => {
      return await db.transaction.findMany({
        where: {
          organizationId,
          transactionDate: {
            gte: startDate,
            lte: endDate
          },
          status: 'COMPLETED'
        },
        orderBy: {
          transactionDate: 'desc'
        }
      })
    })

    // Get store timezone
    const storeTimezone = integration ? getStoreTimezone(integration) : 'America/New_York'
    const now = new Date()
    
    // Calculate today's date range in store timezone
    const todayRange = getStoreDayRange(now, storeTimezone)
    const todayStartUTC = todayRange.startUTC
    const todayEndUTC = todayRange.endUTC
    
    // Filter today's transactions
    const todayTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.transactionDate)
      return txDate >= todayStartUTC && txDate < todayEndUTC
    })

    // Calculate today's numbers
    const todayGrossSales = todayTransactions.reduce((sum, tx) => sum + tx.totalAmount, 0) / 100
    const todayTaxAmount = todayTransactions.reduce((sum, tx) => sum + tx.taxAmount, 0) / 100
    const processingFeeRate = 0.029
    const perTransactionFee = 0.30
    const todayProcessingFees = (todayGrossSales * processingFeeRate) + (todayTransactions.length * perTransactionFee)
    const todayEstimatedPayout = todayGrossSales - todayProcessingFees

    // Group transactions by date to see daily breakdown
    const dailyBreakdown = {}
    transactions.forEach(tx => {
      const dateKey = tx.transactionDate.toISOString().split('T')[0]
      if (!dailyBreakdown[dateKey]) {
        dailyBreakdown[dateKey] = {
          date: dateKey,
          transactions: 0,
          grossSales: 0,
          taxAmount: 0,
          estimatedPayout: 0,
          processingFees: 0
        }
      }
      
      const day = dailyBreakdown[dateKey]
      day.transactions += 1
      day.grossSales += tx.totalAmount / 100
      day.taxAmount += tx.taxAmount / 100
    })

    // Calculate estimated payout for each day
    Object.keys(dailyBreakdown).forEach(dateKey => {
      const day = dailyBreakdown[dateKey]
      day.processingFees = (day.grossSales * processingFeeRate) + (day.transactions * perTransactionFee)
      day.estimatedPayout = day.grossSales - day.processingFees
    })

    return NextResponse.json({
      success: true,
      debug: {
        storeTimezone,
        todayRange: {
          startUTC: todayStartUTC.toISOString(),
          endUTC: todayEndUTC.toISOString(),
          startLocal: todayRange.startLocal.toISOString(),
          endLocal: todayRange.endLocal.toISOString()
        },
        todayStats: {
          transactionCount: todayTransactions.length,
          grossSales: todayGrossSales,
          taxAmount: todayTaxAmount,
          processingFees: todayProcessingFees,
          estimatedPayout: todayEstimatedPayout
        },
        actualShopifyPayout: 1468.47, // What user reported
        difference: 1468.47 - todayEstimatedPayout,
        dailyBreakdown,
        totalTransactionsLast7Days: transactions.length,
        explanation: {
          issue: "Today's estimated payout doesn't match actual Shopify payout",
          possibleReasons: [
            "Shopify payouts include transactions from multiple days (typically 1-3 days ago)",
            "Payout timing doesn't align with transaction dates due to processing delays",
            "Different processing fee structure than assumed (2.9% + $0.30)",
            "Refunds, chargebacks, or other adjustments not accounted for",
            "Store may have different payout schedule settings"
          ]
        }
      }
    })

  } catch (error) {
    console.error('Debug payout calculation error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to debug payout calculation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}