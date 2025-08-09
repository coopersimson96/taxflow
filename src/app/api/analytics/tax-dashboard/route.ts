import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma, withWebhookDb } from '@/lib/prisma'
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
    // SECURITY: Get authenticated user session
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    console.log('Tax dashboard API called by user:', session.user.email)
    console.log('Requested organizationId:', request.nextUrl.searchParams.get('organizationId'))
    console.log('Environment:', process.env.NODE_ENV)

    let organizationId = request.nextUrl.searchParams.get('organizationId')
    
    // SECURITY: Only find integrations that belong to the current user
    if (!organizationId || organizationId === '') {
      console.log('No organizationId provided, looking for user-owned connected Shopify integration...')
      
      // SECURITY: Match user by email in integration credentials to ensure data isolation
      // This assumes the user's email matches the Shopify store owner email
      const userEmail = session.user.email.toLowerCase()
      
      const userIntegration = await withWebhookDb(async (db) => {
        return await db.integration.findFirst({
          where: {
            type: 'SHOPIFY',
            status: 'CONNECTED'
          },
          select: {
            organizationId: true,
            credentials: true
          }
        })
      })
      
      // SECURITY: Verify the integration belongs to this user
      let isUserOwned = false
      if (userIntegration && userIntegration.credentials) {
        const credentials = userIntegration.credentials as any
        const shopifyEmail = credentials.shopInfo?.customer_email?.toLowerCase()
        const shopOwnerEmail = credentials.shopInfo?.email?.toLowerCase()
        
        // Match user email with shop owner or customer email
        if (shopifyEmail === userEmail || shopOwnerEmail === userEmail) {
          organizationId = userIntegration.organizationId
          console.log('Found user-owned integration with organizationId:', organizationId)
          isUserOwned = true
        } else {
          console.log(`Email mismatch: User ${userEmail} vs Shop emails ${shopifyEmail}/${shopOwnerEmail}`)
        }
      }
      
      if (!isUserOwned) {
        // SECURITY: If no user-owned integration found, return empty data instead of demo data
        console.log('No user-owned integration found, returning empty dashboard')
        return NextResponse.json({
          success: true,
          data: {
            taxToSetAside: {
              totalAmount: 0,
              currency: 'USD',
              periodDays: parseInt(request.nextUrl.searchParams.get('days') || '30'),
              recommendedSavingsRate: 0,
              lastCalculated: new Date().toISOString(),
              breakdown: { federal: 0, state: 0, local: 0, gst: 0, pst: 0, hst: 0, qst: 0, other: 0 },
              todayPayoutAmount: 0,
              todayTaxAmount: 0,
              todayBreakdown: { gst: 0, pst: 0, hst: 0, qst: 0, stateTax: 0, localTax: 0, other: 0 },
              monthlyRollingTotal: 0
            },
            summaryMetrics: {
              totalSales: 0, totalTaxCollected: 0, averageTaxRate: 0, orderCount: 0,
              taxableOrderCount: 0, exemptOrderCount: 0, averageOrderValue: 0,
              topSellingRegion: 'Unknown', currency: 'USD'
            },
            taxBreakdown: [],
            trendData: [],
            recentOrders: [],
            jurisdictionData: [],
            upcomingPayouts: [],
            periodComparison: {
              current: { totalSales: 0, totalTax: 0, orderCount: 0, averageOrderValue: 0, taxRate: 0, startDate: new Date().toISOString(), endDate: new Date().toISOString() },
              previous: { totalSales: 0, totalTax: 0, orderCount: 0, averageOrderValue: 0, taxRate: 0, startDate: new Date().toISOString(), endDate: new Date().toISOString() }
            },
            storeInfo: {
              storeName: 'No Store Connected',
              shopDomain: null,
              currency: 'USD',
              country: null
            }
          },
          lastUpdated: new Date().toISOString()
        })
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

    // Calculate tax to set aside data
    const taxToSetAside = calculateTaxToSetAside(currentTransactions, days)

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
      trendData = await calculateTrendData(organizationId, days)
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
    const upcomingPayouts = await generateDailyPayoutData(organizationId)

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
      storeInfo
    }

    return NextResponse.json({
      success: true,
      data: dashboardData,
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

function calculateTaxToSetAside(transactions: any[], days: number): TaxToSetAsideData {
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

  // Calculate today's data
  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
  
  const todayTransactions = transactions.filter(tx => {
    const txDate = new Date(tx.transactionDate)
    return txDate >= todayStart && txDate < todayEnd
  })

  const todayTaxAmount = todayTransactions.reduce((sum, tx) => sum + tx.taxAmount, 0) / 100
  const todayPayoutAmount = todayTransactions.reduce((sum, tx) => sum + (tx.totalAmount - tx.taxAmount), 0) / 100

  const todayBreakdown = {
    gst: todayTransactions.reduce((sum, tx) => sum + tx.gstAmount, 0) / 100,
    pst: todayTransactions.reduce((sum, tx) => sum + tx.pstAmount, 0) / 100,
    hst: todayTransactions.reduce((sum, tx) => sum + tx.hstAmount, 0) / 100,
    qst: todayTransactions.reduce((sum, tx) => sum + tx.qstAmount, 0) / 100,
    stateTax: todayTransactions.reduce((sum, tx) => sum + tx.stateTaxAmount, 0) / 100,
    localTax: todayTransactions.reduce((sum, tx) => sum + tx.localTaxAmount, 0) / 100,
    other: todayTransactions.reduce((sum, tx) => sum + tx.otherTaxAmount, 0) / 100
  }

  // Calculate monthly rolling total
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthlyTransactions = transactions.filter(tx => {
    const txDate = new Date(tx.transactionDate)
    return txDate >= monthStart && txDate <= today
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
      items = tx.items ? JSON.parse(tx.items) : []
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

async function calculateTrendData(organizationId: string, days: number): Promise<TaxTrendData[]> {
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

  // Group by date
  const dateMap: { [key: string]: any } = {}
  
  transactions.forEach(tx => {
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

async function generateDailyPayoutData(organizationId: string) {
  try {
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

    // Group transactions by date
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