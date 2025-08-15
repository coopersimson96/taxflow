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

    const { integrationId, targetDate } = await request.json()

    if (!integrationId) {
      return NextResponse.json({ error: 'Integration ID required' }, { status: 400 })
    }

    // Default to today if no date specified
    const compareDate = targetDate ? new Date(targetDate) : new Date()
    
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

    // Calculate date range for the target date in store timezone
    const storeTimezone = 'America/Los_Angeles'
    const dateInStoreTime = new Date(compareDate.toLocaleString("en-US", {timeZone: storeTimezone}))
    const dayStart = new Date(dateInStoreTime.getFullYear(), dateInStoreTime.getMonth(), dateInStoreTime.getDate())
    const dayStartUTC = new Date(dayStart.getTime() + (dayStart.getTimezoneOffset() * 60000))
    const dayEndUTC = new Date(dayStartUTC.getTime() + 24 * 60 * 60 * 1000)

    console.log('📅 Date range calculation:', {
      inputDate: compareDate.toISOString(),
      storeLocalDate: dateInStoreTime.toISOString(),
      dayStart: dayStart.toISOString(),
      dayStartUTC: dayStartUTC.toISOString(),
      dayEndUTC: dayEndUTC.toISOString()
    })

    // Get all transactions for that day
    const dayTransactions = await withWebhookDb(async (db) => {
      return await db.transaction.findMany({
        where: {
          organizationId: integration.organizationId,
          integrationId: integration.id,
          transactionDate: {
            gte: dayStartUTC,
            lt: dayEndUTC
          }
        },
        orderBy: {
          transactionDate: 'asc'
        }
      })
    })

    // Calculate different metrics that Shopify might be using
    const metrics = {
      // Basic counts
      totalOrders: dayTransactions.length,
      
      // Different total calculations
      grossSales: dayTransactions.reduce((sum, tx) => sum + tx.totalAmount, 0) / 100,
      netSales: dayTransactions.reduce((sum, tx) => sum + (tx.totalAmount - tx.discountAmount), 0) / 100,
      subtotalOnly: dayTransactions.reduce((sum, tx) => sum + tx.subtotal, 0) / 100,
      salesWithoutTax: dayTransactions.reduce((sum, tx) => sum + (tx.totalAmount - tx.taxAmount), 0) / 100,
      
      // Tax breakdown
      totalTax: dayTransactions.reduce((sum, tx) => sum + tx.taxAmount, 0) / 100,
      totalDiscounts: dayTransactions.reduce((sum, tx) => sum + tx.discountAmount, 0) / 100,
      totalShipping: dayTransactions.reduce((sum, tx) => sum + tx.shippingAmount, 0) / 100,
      
      // Status breakdown
      statusBreakdown: dayTransactions.reduce((acc, tx) => {
        acc[tx.status] = (acc[tx.status] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      
      // Sample transactions for inspection
      sampleTransactions: dayTransactions.slice(0, 5).map(tx => ({
        orderNumber: tx.orderNumber,
        externalId: tx.externalId,
        status: tx.status,
        totalAmount: tx.totalAmount / 100,
        subtotal: tx.subtotal / 100,
        taxAmount: tx.taxAmount / 100,
        discountAmount: tx.discountAmount / 100,
        shippingAmount: tx.shippingAmount / 100,
        transactionDate: tx.transactionDate
      }))
    }

    return NextResponse.json({
      success: true,
      analysis: {
        date: compareDate.toISOString().split('T')[0],
        dateRange: {
          start: dayStartUTC.toISOString(),
          end: dayEndUTC.toISOString(),
          timezone: storeTimezone
        },
        metrics,
        comparison: {
          likelyShopifyMetrics: [
            { name: 'Gross Sales (Total Amount)', value: metrics.grossSales },
            { name: 'Net Sales (After Discounts)', value: metrics.netSales },
            { name: 'Subtotal Only', value: metrics.subtotalOnly },
            { name: 'Sales Without Tax', value: metrics.salesWithoutTax },
          ],
          recommendations: [
            `Compare $${metrics.grossSales.toFixed(2)} (Gross Sales) with Shopify`,
            `Compare $${metrics.netSales.toFixed(2)} (Net Sales) with Shopify`,
            `Compare $${metrics.subtotalOnly.toFixed(2)} (Subtotal) with Shopify`,
            `Compare $${metrics.salesWithoutTax.toFixed(2)} (Sales without tax) with Shopify`,
            'Check if Shopify is excluding certain order statuses',
            'Verify timezone alignment - our calculation uses PST/PDT'
          ]
        }
      }
    })

  } catch (error) {
    console.error('Debug daily comparison error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to debug daily comparison',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}