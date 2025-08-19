import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma, withWebhookDb } from '@/lib/prisma'
import { getStoreTimezone, getStoreDayRange } from '@/lib/utils/timezone'
import { 
  TaxDashboardData, 
  TaxToSetAsideData, 
  TaxSummaryMetrics,
  TaxCategoryBreakdown,
  TaxTrendData,
  ShopifyOrderDetail,
  TaxJurisdictionData,
  PeriodComparison,
  ChartConfig
} from '@/types/tax-dashboard'

// Force this route to be dynamic
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Debug database connection
    console.log('🔍 DATABASE_URL:', process.env.DATABASE_URL)
    console.log('🔍 DATABASE_URL length:', process.env.DATABASE_URL?.length)
    console.log('🔍 NODE_ENV:', process.env.NODE_ENV)
    console.log('🔍 VERCEL:', process.env.VERCEL)
    console.log('🔍 All env vars starting with DB:', Object.keys(process.env).filter(key => key.startsWith('DB')))
    
    // SECURITY: Get authenticated user session
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    console.log('🔍 Tax Dashboard API - User:', session.user.email)

    // Test database connection first
    try {
      await prisma.$queryRaw`SELECT 1 as test`
      console.log('✅ Database connection test successful')
    } catch (dbError) {
      console.error('❌ Database connection test failed:', dbError)
      // Try to get more details about the connection URL being used
      if (dbError instanceof Error && dbError.message.includes('Can\'t reach database server')) {
        console.error('🔍 Connection error details:', dbError.message)
        console.error('🔍 This suggests either network issue or wrong URL format')
      }
      return NextResponse.json(
        { 
          error: 'Database connection failed',
          details: dbError instanceof Error ? dbError.message : 'Unknown database error',
          envUrl: process.env.DATABASE_URL ? 'SET' : 'NOT_SET'
        },
        { status: 500 }
      )
    }

    let organizationId = request.nextUrl.searchParams.get('organizationId')
    let integrationId: string | null = null
    
    // If no specific organization requested, find user's organizations
    if (!organizationId || organizationId === '') {
      console.log('🔍 Finding user organizations...')
      
      // Get user with their organization memberships
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
      
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
      
      console.log(`🔍 User has ${user.organizations.length} organization memberships`)
      
      // Find organizations with Shopify integrations
      const organizationsWithIntegrations = user.organizations.filter(
        membership => membership.organization.integrations.length > 0
      )
      
      if (organizationsWithIntegrations.length === 0) {
        return NextResponse.json(
          { 
            error: 'No Shopify store connected',
            message: 'Please connect your Shopify store to start tracking tax analytics.'
          }, 
          { status: 404 }
        )
      }
      
      // Use the first organization with an integration
      // TODO: In the future, allow user to select which store to view
      const selectedOrg = organizationsWithIntegrations[0]
      organizationId = selectedOrg.organizationId
      integrationId = selectedOrg.organization.integrations[0].id
      
      console.log(`✅ Selected organization: ${selectedOrg.organization.name}`)
    } else {
      // Verify user has access to the requested organization
      const membership = await withWebhookDb(async (db) => {
        const user = await db.user.findUnique({ where: { email: session.user.email! } })
        if (!user || !organizationId) {
          return null
        }
        
        return await db.organizationMember.findUnique({
          where: {
            userId_organizationId: {
              userId: user.id,
              organizationId: organizationId
            }
          },
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
        })
      })
      
      if (!membership) {
        return NextResponse.json(
          { error: 'Access denied to this organization' },
          { status: 403 }
        )
      }
      
      if (membership.organization.integrations.length > 0) {
        integrationId = membership.organization.integrations[0].id
      }
    }

    // SECURITY: Add additional validation that the user has access to this organizationId
    // (This would need proper user-organization relationship implementation)
    const days = parseInt(request.nextUrl.searchParams.get('days') || '30')
    const includeTrends = request.nextUrl.searchParams.get('includeTrends') === 'true'

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    }

    // Calculate date ranges
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000))
    const previousStartDate = new Date(startDate.getTime() - (days * 24 * 60 * 60 * 1000))

    // Fetch current period transactions using withWebhookDb for connection retry
    console.log(`Fetching transactions for orgId: ${organizationId}, from ${startDate.toISOString()} to ${endDate.toISOString()}`)
    const currentTransactions = await withWebhookDb(async (db) => {
      return await db.transaction.findMany({
        where: {
          organizationId,
          transactionDate: {
            gte: startDate,
            lte: endDate
          },
          status: 'COMPLETED'
        },
        include: {
          integration: true
        },
        orderBy: {
          transactionDate: 'desc'
        }
      })
    })
    console.log(`Found ${currentTransactions.length} current transactions`)

    // Fetch previous period transactions for comparison
    const previousTransactions = await withWebhookDb(async (db) => {
      return await db.transaction.findMany({
        where: {
          organizationId,
          transactionDate: {
            gte: previousStartDate,
            lt: startDate
          },
          status: 'COMPLETED'
        },
        include: {
          integration: true
        }
      })
    })

    // Get integration for timezone info
    const integration = integrationId ? await withWebhookDb(async (db) => {
      return await db.integration.findUnique({
        where: { id: integrationId }
      })
    }) : null

    // Calculate tax to set aside data
    const taxToSetAside = calculateTaxToSetAside(currentTransactions, days, integration)

    // Calculate summary metrics
    const summaryMetrics = calculateSummaryMetrics(currentTransactions)

    // Calculate tax breakdown by category
    const taxBreakdown = calculateTaxBreakdown(currentTransactions)

    // Calculate period comparison
    const periodComparison = calculatePeriodComparison(currentTransactions, previousTransactions, startDate, endDate, previousStartDate)

    // Get recent orders with details
    const recentOrders = await getRecentOrderDetails(currentTransactions.slice(0, 20))

    // Calculate jurisdiction data
    const jurisdictionData = calculateJurisdictionData(currentTransactions)

    // Get trend data if requested
    let trendData: TaxTrendData[] = []
    if (includeTrends) {
      trendData = await calculateTrendData(organizationId, days, integration)
    }

    const chartConfig: ChartConfig = {
      colors: {
        primary: '#3b82f6',
        secondary: '#10b981',
        gst: '#10b981',
        pst: '#3b82f6',
        hst: '#8b5cf6',
        qst: '#f59e0b',
        stateTax: '#ef4444',
        localTax: '#84cc16',
        other: '#6b7280'
      },
      gradients: {
        primary: ['#3b82f6', '#1d4ed8'],
        tax: ['#10b981', '#059669']
      }
    }

    // Generate daily payout data
    const upcomingPayouts = await generateDailyPayoutData(organizationId, integration)

    // Get store information from integration
    const storeInfo = await getStoreInformation(organizationId)

    const dashboardData: TaxDashboardData = {
      taxToSetAside,
      summaryMetrics,
      taxBreakdown,
      trendData,
      recentOrders,
      jurisdictionData,
      periodComparison,
      upcomingPayouts,
      storeInfo: {
        ...storeInfo,
        timezone: integration ? getStoreTimezone(integration) : 'America/New_York'
      }
    }

    return NextResponse.json({
      success: true,
      data: dashboardData,
      integrationId: integrationId,
      lastUpdated: new Date().toISOString()
    })

  } catch (error) {
    console.error('Tax dashboard API error:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function calculateTaxToSetAside(transactions: any[], days: number, integration: any): TaxToSetAsideData {
  const totalTaxCollected = transactions.reduce((sum, tx) => sum + tx.taxAmount, 0) / 100
  const totalSales = transactions.reduce((sum, tx) => sum + tx.totalAmount, 0) / 100

  // Calculate breakdown by tax type
  const breakdown = {
    federal: 0,
    state: transactions.reduce((sum, tx) => sum + tx.stateTaxAmount, 0) / 100,
    local: transactions.reduce((sum, tx) => sum + tx.localTaxAmount, 0) / 100,
    gst: transactions.reduce((sum, tx) => sum + tx.gstAmount, 0) / 100,
    pst: transactions.reduce((sum, tx) => sum + tx.pstAmount, 0) / 100,
    hst: transactions.reduce((sum, tx) => sum + tx.hstAmount, 0) / 100,
    qst: transactions.reduce((sum, tx) => sum + tx.qstAmount, 0) / 100,
    other: transactions.reduce((sum, tx) => sum + tx.otherTaxAmount, 0) / 100
  }

  // Calculate tax to set aside using actual Shopify payouts
  const payoutData = await getActualShopifyPayouts(integration)
  
  let todayPayoutAmount = 0
  let todayTaxAmount = 0
  let todayBreakdown = {
    gst: 0, pst: 0, hst: 0, qst: 0, stateTax: 0, localTax: 0, other: 0
  }

  if (payoutData && payoutData.todaysPayout) {
    // Use actual payout amount from Shopify
    todayPayoutAmount = payoutData.todaysPayout.amount
    
    // Calculate tax percentage from recent transaction data
    const totalSales = transactions.reduce((sum, tx) => sum + tx.totalAmount, 0) / 100
    const totalTax = transactions.reduce((sum, tx) => sum + tx.taxAmount, 0) / 100
    const taxRate = totalSales > 0 ? totalTax / totalSales : 0
    
    // Apply tax rate to actual payout amount
    todayTaxAmount = todayPayoutAmount * taxRate
    
    // Calculate proportional tax breakdown
    if (totalTax > 0) {
      const allTaxBreakdown = {
        gst: transactions.reduce((sum, tx) => sum + tx.gstAmount, 0) / 100,
        pst: transactions.reduce((sum, tx) => sum + tx.pstAmount, 0) / 100,
        hst: transactions.reduce((sum, tx) => sum + tx.hstAmount, 0) / 100,
        qst: transactions.reduce((sum, tx) => sum + tx.qstAmount, 0) / 100,
        stateTax: transactions.reduce((sum, tx) => sum + tx.stateTaxAmount, 0) / 100,
        localTax: transactions.reduce((sum, tx) => sum + tx.localTaxAmount, 0) / 100,
        other: transactions.reduce((sum, tx) => sum + tx.otherTaxAmount, 0) / 100
      }
      
      // Scale breakdown proportionally to today's tax amount
      todayBreakdown = {
        gst: (allTaxBreakdown.gst / totalTax) * todayTaxAmount,
        pst: (allTaxBreakdown.pst / totalTax) * todayTaxAmount,
        hst: (allTaxBreakdown.hst / totalTax) * todayTaxAmount,
        qst: (allTaxBreakdown.qst / totalTax) * todayTaxAmount,
        stateTax: (allTaxBreakdown.stateTax / totalTax) * todayTaxAmount,
        localTax: (allTaxBreakdown.localTax / totalTax) * todayTaxAmount,
        other: (allTaxBreakdown.other / totalTax) * todayTaxAmount
      }
    }
  }

  // Calculate monthly rolling total
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthlyTransactions = transactions.filter(tx => {
    const txDate = new Date(tx.transactionDate)
    return txDate >= monthStart && txDate <= now
  })
  const monthlyRollingTotal = monthlyTransactions.reduce((sum, tx) => sum + tx.taxAmount, 0) / 100

  const recommendedSavingsRate = totalSales > 0 ? (totalTaxCollected / totalSales) * 100 : 0

  return {
    totalAmount: totalTaxCollected,
    currency: 'USD',
    periodDays: days,
    recommendedSavingsRate,
    lastCalculated: new Date().toISOString(),
    breakdown,
    // Today's payout information
    todayPayoutAmount,
    todayTaxAmount,
    todayBreakdown,
    monthlyRollingTotal
  }
}

function calculateSummaryMetrics(transactions: any[]): TaxSummaryMetrics {
  const totalSales = transactions.reduce((sum, tx) => sum + tx.totalAmount, 0) / 100
  const totalTaxCollected = transactions.reduce((sum, tx) => sum + tx.taxAmount, 0) / 100
  const orderCount = transactions.length
  const taxableOrders = transactions.filter(tx => tx.taxAmount > 0)
  const exemptOrders = transactions.filter(tx => tx.taxExempt)

  // Group by country to find top selling region
  const regionCounts: { [key: string]: number } = {}
  transactions.forEach(tx => {
    const region = tx.taxCountry || 'Unknown'
    regionCounts[region] = (regionCounts[region] || 0) + 1
  })
  const topSellingRegion = Object.keys(regionCounts).reduce((a, b) => 
    regionCounts[a] > regionCounts[b] ? a : b, 'Unknown'
  )

  return {
    totalSales,
    totalTaxCollected,
    averageTaxRate: totalSales > 0 ? (totalTaxCollected / totalSales) * 100 : 0,
    orderCount,
    taxableOrderCount: taxableOrders.length,
    exemptOrderCount: exemptOrders.length,
    averageOrderValue: orderCount > 0 ? totalSales / orderCount : 0,
    topSellingRegion,
    currency: 'USD'
  }
}

function calculateTaxBreakdown(transactions: any[]): TaxCategoryBreakdown[] {
  const breakdown: TaxCategoryBreakdown[] = [
    {
      category: 'GST',
      name: 'Goods & Services Tax (GST)',
      amount: transactions.reduce((sum, tx) => sum + tx.gstAmount, 0) / 100,
      rate: 5.0, // Typical GST rate
      applicableOrders: transactions.filter(tx => tx.gstAmount > 0).length,
      totalTaxableAmount: transactions.reduce((sum, tx) => tx.gstAmount > 0 ? sum + tx.totalAmount : sum, 0) / 100,
      jurisdiction: 'Canada',
      color: '#10b981'
    },
    {
      category: 'PST',
      name: 'Provincial Sales Tax (PST)',
      amount: transactions.reduce((sum, tx) => sum + tx.pstAmount, 0) / 100,
      rate: 7.0, // Typical PST rate
      applicableOrders: transactions.filter(tx => tx.pstAmount > 0).length,
      totalTaxableAmount: transactions.reduce((sum, tx) => tx.pstAmount > 0 ? sum + tx.totalAmount : sum, 0) / 100,
      jurisdiction: 'Provincial',
      color: '#3b82f6'
    },
    {
      category: 'HST',
      name: 'Harmonized Sales Tax (HST)',
      amount: transactions.reduce((sum, tx) => sum + tx.hstAmount, 0) / 100,
      rate: 13.0, // Typical HST rate
      applicableOrders: transactions.filter(tx => tx.hstAmount > 0).length,
      totalTaxableAmount: transactions.reduce((sum, tx) => tx.hstAmount > 0 ? sum + tx.totalAmount : sum, 0) / 100,
      jurisdiction: 'Canada',
      color: '#8b5cf6'
    },
    {
      category: 'QST',
      name: 'Quebec Sales Tax (QST)',
      amount: transactions.reduce((sum, tx) => sum + tx.qstAmount, 0) / 100,
      rate: 9.975, // QST rate
      applicableOrders: transactions.filter(tx => tx.qstAmount > 0).length,
      totalTaxableAmount: transactions.reduce((sum, tx) => tx.qstAmount > 0 ? sum + tx.totalAmount : sum, 0) / 100,
      jurisdiction: 'Quebec',
      color: '#f59e0b'
    },
    {
      category: 'STATE_TAX',
      name: 'State Tax',
      amount: transactions.reduce((sum, tx) => sum + tx.stateTaxAmount, 0) / 100,
      rate: 6.5, // Average state tax rate
      applicableOrders: transactions.filter(tx => tx.stateTaxAmount > 0).length,
      totalTaxableAmount: transactions.reduce((sum, tx) => tx.stateTaxAmount > 0 ? sum + tx.totalAmount : sum, 0) / 100,
      jurisdiction: 'US States',
      color: '#ef4444'
    },
    {
      category: 'LOCAL_TAX',
      name: 'Local Tax',
      amount: transactions.reduce((sum, tx) => sum + tx.localTaxAmount, 0) / 100,
      rate: 2.0, // Average local tax rate
      applicableOrders: transactions.filter(tx => tx.localTaxAmount > 0).length,
      totalTaxableAmount: transactions.reduce((sum, tx) => tx.localTaxAmount > 0 ? sum + tx.totalAmount : sum, 0) / 100,
      jurisdiction: 'Local',
      color: '#84cc16'
    },
    {
      category: 'OTHER',
      name: 'Other Taxes',
      amount: transactions.reduce((sum, tx) => sum + tx.otherTaxAmount, 0) / 100,
      rate: 5.0, // Average other tax rate
      applicableOrders: transactions.filter(tx => tx.otherTaxAmount > 0).length,
      totalTaxableAmount: transactions.reduce((sum, tx) => tx.otherTaxAmount > 0 ? sum + tx.totalAmount : sum, 0) / 100,
      color: '#6b7280'
    }
  ]

  return breakdown.filter(item => item.amount > 0)
}

function calculatePeriodComparison(
  currentTransactions: any[],
  previousTransactions: any[],
  startDate: Date,
  endDate: Date,
  previousStartDate: Date
): PeriodComparison {
  const calculatePeriodData = (transactions: any[], start: Date, end: Date) => {
    const totalSales = transactions.reduce((sum, tx) => sum + tx.totalAmount, 0) / 100
    const totalTax = transactions.reduce((sum, tx) => sum + tx.taxAmount, 0) / 100
    const orderCount = transactions.length
    const averageOrderValue = orderCount > 0 ? totalSales / orderCount : 0
    const taxRate = totalSales > 0 ? (totalTax / totalSales) * 100 : 0

    return {
      totalSales,
      totalTax,
      orderCount,
      averageOrderValue,
      taxRate,
      startDate: start.toISOString(),
      endDate: end.toISOString()
    }
  }

  return {
    current: calculatePeriodData(currentTransactions, startDate, endDate),
    previous: calculatePeriodData(previousTransactions, previousStartDate, startDate)
  }
}

async function getRecentOrderDetails(transactions: any[]): Promise<ShopifyOrderDetail[]> {
  return transactions.map(tx => {
    // Parse items if they exist
    let items = []
    try {
      // Check if items is already an object (Prisma returns JSON fields as objects)
      if (tx.items) {
        items = typeof tx.items === 'string' ? JSON.parse(tx.items) : tx.items
      }
    } catch (error) {
      console.warn('Failed to parse transaction items:', error)
      items = []
    }

    return {
      id: tx.id,
      orderNumber: tx.orderNumber || tx.externalId,
      date: tx.transactionDate.toISOString(),
      subtotal: tx.subtotal / 100,
      totalTax: tx.taxAmount / 100,
      totalAmount: tx.totalAmount / 100,
      currency: tx.currency,
      customerName: tx.customerName,
      customerEmail: tx.customerEmail,
      taxBreakdown: {
        gst: tx.gstAmount / 100,
        pst: tx.pstAmount / 100,
        hst: tx.hstAmount / 100,
        qst: tx.qstAmount / 100,
        stateTax: tx.stateTaxAmount / 100,
        localTax: tx.localTaxAmount / 100,
        other: tx.otherTaxAmount / 100
      },
      jurisdiction: {
        country: tx.taxCountry || 'Unknown',
        province: tx.taxProvince,
        city: tx.taxCity,
        postalCode: tx.taxPostalCode
      },
      items: items.map((item: any) => ({
        id: item.id || '',
        productName: item.name || item.product_name || 'Unknown Product',
        quantity: item.quantity || 1,
        unitPrice: (item.price || 0) / 100,
        totalPrice: (item.total || item.price * item.quantity || 0) / 100,
        taxAmount: (item.tax_amount || 0) / 100,
        taxable: !item.tax_exempt
      })),
      taxExempt: tx.taxExempt,
      exemptionReason: tx.taxExemptReason
    }
  })
}

function calculateJurisdictionData(transactions: any[]): TaxJurisdictionData[] {
  const jurisdictionMap: { [key: string]: any } = {}

  transactions.forEach(tx => {
    const key = `${tx.taxCountry || 'Unknown'}-${tx.taxProvince || ''}-${tx.taxCity || ''}`
    
    if (!jurisdictionMap[key]) {
      jurisdictionMap[key] = {
        jurisdiction: `${tx.taxCountry || 'Unknown'}${tx.taxProvince ? ` - ${tx.taxProvince}` : ''}${tx.taxCity ? ` - ${tx.taxCity}` : ''}`,
        country: tx.taxCountry || 'Unknown',
        state: tx.taxProvince,
        province: tx.taxProvince,
        city: tx.taxCity,
        totalSales: 0,
        totalTax: 0,
        orderCount: 0,
        breakdown: {
          gst: 0,
          pst: 0,
          hst: 0,
          qst: 0,
          stateTax: 0,
          localTax: 0,
          other: 0
        }
      }
    }

    const jData = jurisdictionMap[key]
    jData.totalSales += tx.totalAmount / 100
    jData.totalTax += tx.taxAmount / 100
    jData.orderCount += 1
    jData.breakdown.gst += tx.gstAmount / 100
    jData.breakdown.pst += tx.pstAmount / 100
    jData.breakdown.hst += tx.hstAmount / 100
    jData.breakdown.qst += tx.qstAmount / 100
    jData.breakdown.stateTax += tx.stateTaxAmount / 100
    jData.breakdown.localTax += tx.localTaxAmount / 100
    jData.breakdown.other += tx.otherTaxAmount / 100
  })

  return Object.values(jurisdictionMap).map((jData: any) => ({
    ...jData,
    taxRate: jData.totalSales > 0 ? (jData.totalTax / jData.totalSales) * 100 : 0
  }))
}

async function calculateTrendData(organizationId: string, days: number, integration: any = null): Promise<TaxTrendData[]> {
  // Get store timezone
  const storeTimezone = integration ? getStoreTimezone(integration) : 'America/New_York'
  
  const endDate = new Date()
  const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000))

  // Get transactions grouped by date
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
        transactionDate: 'asc'
      }
    })
  })

  // Group by date in store timezone
  const dateMap: { [key: string]: any } = {}
  
  transactions.forEach(tx => {
    // Use UTC date for grouping (for now to avoid timezone conversion issues)
    const dateKey = tx.transactionDate.toISOString().split('T')[0]
    
    if (!dateMap[dateKey]) {
      dateMap[dateKey] = {
        date: dateKey,
        totalSales: 0,
        taxCollected: 0,
        orderCount: 0,
        gst: 0,
        pst: 0,
        hst: 0,
        qst: 0,
        stateTax: 0,
        localTax: 0,
        other: 0
      }
    }

    const dayData = dateMap[dateKey]
    dayData.totalSales += tx.totalAmount / 100
    dayData.taxCollected += tx.taxAmount / 100
    dayData.orderCount += 1
    dayData.gst += tx.gstAmount / 100
    dayData.pst += tx.pstAmount / 100
    dayData.hst += tx.hstAmount / 100
    dayData.qst += tx.qstAmount / 100
    dayData.stateTax += tx.stateTaxAmount / 100
    dayData.localTax += tx.localTaxAmount / 100
    dayData.other += tx.otherTaxAmount / 100
  })

  return Object.values(dateMap).map((dayData: any) => ({
    ...dayData,
    taxRate: dayData.totalSales > 0 ? (dayData.taxCollected / dayData.totalSales) * 100 : 0
  }))
}

async function generateDailyPayoutData(organizationId: string, integration: any = null) {
  try {
    // Get store timezone
    const storeTimezone = integration ? getStoreTimezone(integration) : 'America/New_York'
    
    // Get transactions from the last 5 days to generate payout data
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - 5 * 24 * 60 * 60 * 1000)

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

    // Group transactions by date (using UTC for now to avoid timezone conversion issues)
    const dateGroups: { [key: string]: any[] } = {}
    transactions.forEach(tx => {
      const dateKey = tx.transactionDate.toISOString().split('T')[0]
      if (!dateGroups[dateKey]) {
        dateGroups[dateKey] = []
      }
      dateGroups[dateKey].push(tx)
    })

    // Generate payout data for each date
    const payouts = []
    let statusIndex = 0

    for (const [dateKey, dayTransactions] of Object.entries(dateGroups)) {
      const grossSales = dayTransactions.reduce((sum, tx) => sum + tx.totalAmount, 0) / 100
      const taxCollected = dayTransactions.reduce((sum, tx) => sum + tx.taxAmount, 0) / 100
      const fees = Math.round(grossSales * 0.029 * 100) / 100 // 2.9% processing fee
      const payoutAmount = grossSales - fees

      // Status progression: paid -> in_transit -> pending
      let status: 'pending' | 'in_transit' | 'paid'
      let estimatedArrival
      
      if (statusIndex < 2) {
        status = 'paid'
      } else if (statusIndex < 4) {
        status = 'in_transit'
        const futureDate = new Date(endDate.getTime() + (statusIndex - 2) * 24 * 60 * 60 * 1000)
        estimatedArrival = futureDate.toISOString()
      } else {
        status = 'pending'
        const futureDate = new Date(endDate.getTime() + 2 * 24 * 60 * 60 * 1000)
        estimatedArrival = futureDate.toISOString()
      }

      // Sample orders for this payout (limit to 5 for display)
      const orders = dayTransactions.slice(0, 5).map(tx => ({
        orderNumber: tx.orderNumber || tx.externalId || `#${tx.id}`,
        amount: tx.totalAmount / 100,
        tax: tx.taxAmount / 100,
        customer: tx.customerName || 'Customer'
      }))

      payouts.push({
        payoutDate: dateKey + 'T00:00:00.000Z',
        payoutAmount,
        ordersCount: dayTransactions.length,
        grossSales,
        fees,
        refunds: 0, // Could calculate from transaction data if refund info is available
        taxCollected,
        taxToSetAside: taxCollected,
        taxBreakdown: {
          gst: dayTransactions.reduce((sum, tx) => sum + tx.gstAmount, 0) / 100,
          pst: dayTransactions.reduce((sum, tx) => sum + tx.pstAmount, 0) / 100,
          hst: dayTransactions.reduce((sum, tx) => sum + tx.hstAmount, 0) / 100,
          qst: dayTransactions.reduce((sum, tx) => sum + tx.qstAmount, 0) / 100,
          stateTax: dayTransactions.reduce((sum, tx) => sum + tx.stateTaxAmount, 0) / 100,
          localTax: dayTransactions.reduce((sum, tx) => sum + tx.localTaxAmount, 0) / 100,
          other: dayTransactions.reduce((sum, tx) => sum + tx.otherTaxAmount, 0) / 100
        },
        orders,
        status,
        estimatedArrival
      })

      statusIndex++
    }

    return payouts.sort((a, b) => new Date(b.payoutDate).getTime() - new Date(a.payoutDate).getTime())
  } catch (error) {
    console.error('Error generating daily payout data:', error)
    return []
  }
}

async function getActualShopifyPayouts(integration: any) {
  try {
    if (!integration?.credentials?.accessToken) {
      console.log('❌ No access token available for payout API')
      return null
    }

    const credentials = integration.credentials as any
    const accessToken = credentials.accessToken
    const shopDomain = credentials.shopInfo?.myshopify_domain || credentials.shopInfo?.domain

    if (!shopDomain) {
      console.log('❌ No shop domain found')
      return null
    }

    // Fetch recent payouts from Shopify
    const payoutUrl = `https://${shopDomain}/admin/api/2024-01/shopify_payments/payouts.json?status=paid&limit=5`
    
    console.log('🌐 Fetching actual payouts from Shopify:', payoutUrl)
    
    const response = await fetch(payoutUrl, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      console.log('❌ Payout API failed:', response.status, response.statusText)
      return null
    }

    const data = await response.json()
    
    if (!data.payouts || data.payouts.length === 0) {
      console.log('❌ No payouts found')
      return null
    }

    // Find today's payout (most recent)
    const today = new Date().toISOString().split('T')[0]
    const todaysPayout = data.payouts.find((payout: any) => {
      const payoutDate = new Date(payout.date).toISOString().split('T')[0]
      return payoutDate === today
    })

    // If no payout today, use the most recent one
    const recentPayout = todaysPayout || data.payouts[0]

    console.log('✅ Found actual payout:', {
      id: recentPayout.id,
      amount: recentPayout.amount,
      date: recentPayout.date,
      status: recentPayout.status
    })

    return {
      todaysPayout: {
        id: recentPayout.id,
        amount: parseFloat(recentPayout.amount),
        date: recentPayout.date,
        status: recentPayout.status
      },
      allPayouts: data.payouts.map((p: any) => ({
        id: p.id,
        amount: parseFloat(p.amount),
        date: p.date,
        status: p.status
      }))
    }

  } catch (error) {
    console.error('❌ Error fetching Shopify payouts:', error)
    return null
  }
}

async function getStoreInformation(organizationId: string) {
  try {
    const integration = await withWebhookDb(async (db) => {
      return await db.integration.findFirst({
        where: {
          organizationId,
          type: 'SHOPIFY',
          status: 'CONNECTED'
        }
      })
    })

    if (integration && integration.credentials && typeof integration.credentials === 'object') {
      const credentials = integration.credentials as any
      if (credentials.shopInfo && credentials.shopInfo.name) {
        return {
          storeName: credentials.shopInfo.name,
          shopDomain: credentials.shopInfo.domain || credentials.shopInfo.myshopify_domain,
          currency: credentials.shopInfo.currency || 'USD',
          country: credentials.shopInfo.country_name || credentials.shopInfo.country
        }
      }
    }

    // Fallback if no integration found
    return {
      storeName: 'Your Store',
      shopDomain: null,
      currency: 'USD',
      country: null
    }
  } catch (error) {
    console.error('Error getting store information:', error)
    return {
      storeName: 'Your Store',
      shopDomain: null,
      currency: 'USD',  
      country: null
    }
  }
}