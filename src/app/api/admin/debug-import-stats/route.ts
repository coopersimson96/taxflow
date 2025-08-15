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

    const { integrationId } = await request.json()

    if (!integrationId) {
      return NextResponse.json({ error: 'Integration ID required' }, { status: 400 })
    }

    // Get integration details
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

    // Get ALL transactions for this integration
    const allTransactions = await withWebhookDb(async (db) => {
      return await db.transaction.findMany({
        where: {
          organizationId: integration.organizationId,
          integrationId: integration.id
        },
        orderBy: {
          transactionDate: 'asc'
        }
      })
    })

    // Analyze the data
    const transactionsByDate = allTransactions.reduce((acc, tx) => {
      const date = new Date(tx.transactionDate).toISOString().split('T')[0]
      if (!acc[date]) {
        acc[date] = []
      }
      acc[date].push(tx)
      return acc
    }, {} as Record<string, any[]>)

    const dateStats = Object.keys(transactionsByDate).map(date => ({
      date,
      count: transactionsByDate[date].length,
      totalSales: transactionsByDate[date].reduce((sum, tx) => sum + tx.totalAmount, 0) / 100,
      totalTax: transactionsByDate[date].reduce((sum, tx) => sum + tx.taxAmount, 0) / 100
    })).sort((a, b) => a.date.localeCompare(b.date))

    // Check integration config for import history
    const config = integration.config as any
    const importHistory = {
      lastSyncAt: integration.lastSyncAt,
      historicalImportCompleted: config?.historicalImportCompleted || false,
      historicalImportDate: config?.historicalImportDate || null,
      historicalImportRange: config?.historicalImportRange || null,
      lastImportOrderCount: config?.lastImportOrderCount || null
    }

    // Sample of external IDs to see the pattern
    const sampleExternalIds = allTransactions.slice(0, 10).map(tx => tx.externalId).sort()
    
    return NextResponse.json({
      success: true,
      analysis: {
        integration: {
          id: integration.id,
          name: integration.name,
          status: integration.status,
          createdAt: integration.createdAt
        },
        transactionStats: {
          totalCount: allTransactions.length,
          dateRange: {
            oldest: allTransactions.length > 0 ? allTransactions[0].transactionDate : null,
            newest: allTransactions.length > 0 ? allTransactions[allTransactions.length - 1].transactionDate : null
          },
          uniqueDates: Object.keys(transactionsByDate).length,
          averagePerDay: allTransactions.length / Math.max(Object.keys(transactionsByDate).length, 1)
        },
        importHistory,
        dateBreakdown: dateStats,
        sampleExternalIds,
        recommendations: [
          allTransactions.length < 100 ? 'Very few transactions - check if import completed' : null,
          Object.keys(transactionsByDate).length < 30 ? 'Limited date range - may need longer import period' : null,
          !importHistory.historicalImportCompleted ? 'Historical import not marked as completed' : null,
          'Compare with your Shopify order count to verify completeness'
        ].filter(Boolean)
      }
    })

  } catch (error) {
    console.error('Debug import stats error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to debug import stats',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}