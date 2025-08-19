import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { withWebhookDb } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { integrationId, startDate, endDate } = await request.json()

    if (!integrationId) {
      return NextResponse.json({ error: 'Integration ID required' }, { status: 400 })
    }

    // Get integration
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

    // Get transactions for the date range
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const end = endDate ? new Date(endDate) : new Date()

    const transactions = await withWebhookDb(async (db) => {
      return await db.transaction.findMany({
        where: {
          organizationId: integration.organizationId,
          integrationId: integration.id,
          transactionDate: {
            gte: start,
            lte: end
          },
          status: 'COMPLETED'
        },
        orderBy: {
          transactionDate: 'asc'
        }
      })
    })

    // Group transactions by date
    const dailyGroups: { [key: string]: any } = {}
    
    transactions.forEach(tx => {
      const dateKey = tx.transactionDate.toISOString().split('T')[0]
      if (!dailyGroups[dateKey]) {
        dailyGroups[dateKey] = {
          date: dateKey,
          transactions: [],
          totalSales: 0,
          totalTax: 0,
          totalFees: 0,
          netPayout: 0,
          orderCount: 0
        }
      }
      
      dailyGroups[dateKey].transactions.push(tx)
      dailyGroups[dateKey].totalSales += tx.totalAmount / 100
      dailyGroups[dateKey].totalTax += tx.taxAmount / 100
      dailyGroups[dateKey].orderCount += 1
    })

    // Calculate estimated payouts for each day
    const estimatedPayouts = Object.values(dailyGroups).map((group: any) => {
      // Shopify typically charges 2.9% + $0.30 per transaction for online payments
      const processingFeeRate = 0.029
      const perTransactionFee = 0.30
      
      // Calculate fees
      const percentageFees = group.totalSales * processingFeeRate
      const transactionFees = group.orderCount * perTransactionFee
      const totalFees = percentageFees + transactionFees
      
      // Net payout = Sales - Fees
      const netPayout = group.totalSales - totalFees
      
      // Tax to set aside from this payout
      const taxRate = group.totalSales > 0 ? (group.totalTax / group.totalSales) : 0
      const taxToSetAside = group.totalTax
      
      return {
        date: group.date,
        orderCount: group.orderCount,
        grossSales: group.totalSales,
        totalTax: group.totalTax,
        processingFees: totalFees,
        estimatedPayout: netPayout,
        taxToSetAside: taxToSetAside,
        taxRate: taxRate * 100,
        taxBreakdown: calculateTaxBreakdown(group.transactions),
        orders: group.transactions.slice(0, 5).map((tx: any) => ({
          orderNumber: tx.orderNumber || tx.externalId,
          amount: tx.totalAmount / 100,
          tax: tx.taxAmount / 100,
          time: tx.transactionDate.toISOString()
        }))
      }
    })

    // Sort by date descending (most recent first)
    estimatedPayouts.sort((a, b) => b.date.localeCompare(a.date))

    // Find today's estimated payout
    const today = new Date().toISOString().split('T')[0]
    const todaysPayout = estimatedPayouts.find(p => p.date === today)

    return NextResponse.json({
      success: true,
      analysis: {
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString()
        },
        totalDays: estimatedPayouts.length,
        estimatedPayouts: estimatedPayouts.slice(0, 10), // Last 10 days
        todaysPayout,
        summary: {
          totalGrossSales: estimatedPayouts.reduce((sum, p) => sum + p.grossSales, 0),
          totalTax: estimatedPayouts.reduce((sum, p) => sum + p.totalTax, 0),
          totalFees: estimatedPayouts.reduce((sum, p) => sum + p.processingFees, 0),
          totalEstimatedPayouts: estimatedPayouts.reduce((sum, p) => sum + p.estimatedPayout, 0)
        },
        notes: [
          'Payouts are estimated based on 2.9% + $0.30 per transaction',
          'Actual payouts may vary based on your Shopify plan and payment settings',
          'Payouts typically arrive 1-3 business days after the sale',
          'This analysis groups orders by transaction date'
        ]
      }
    })

  } catch (error) {
    console.error('Analyze payouts error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to analyze payouts',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function calculateTaxBreakdown(transactions: any[]) {
  const breakdown = {
    gst: 0,
    pst: 0,
    hst: 0,
    qst: 0,
    stateTax: 0,
    localTax: 0,
    other: 0
  }
  
  transactions.forEach(tx => {
    breakdown.gst += tx.gstAmount / 100
    breakdown.pst += tx.pstAmount / 100
    breakdown.hst += tx.hstAmount / 100
    breakdown.qst += tx.qstAmount / 100
    breakdown.stateTax += tx.stateTaxAmount / 100
    breakdown.localTax += tx.localTaxAmount / 100
    breakdown.other += tx.otherTaxAmount / 100
  })
  
  return breakdown
}