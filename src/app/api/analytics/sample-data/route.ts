import { NextRequest, NextResponse } from 'next/server'
import { TaxDashboardData } from '@/types/tax-dashboard'

// Force this route to be dynamic
export const dynamic = 'force-dynamic'

// Sample data generator for testing the dashboard
export async function GET(request: NextRequest) {
  try {
    const days = parseInt(request.nextUrl.searchParams.get('days') || '30')

    // Generate payout data first
    const payouts = generatePayoutData()
    const todayPayout = payouts[0] // Get most recent payout
    const currentMonth = new Date().getMonth()
    const monthlyPayouts = payouts.filter(p => {
      const payoutMonth = new Date(p.payoutDate).getMonth()
      return payoutMonth === currentMonth
    })
    const monthlyTotal = monthlyPayouts.reduce((sum, p) => sum + p.taxToSetAside, 0)

    // Generate sample data
    const sampleData: TaxDashboardData = {
      storeInfo: {
        storeName: 'Sample Store',
        domain: 'sample-store.myshopify.com',
        email: 'sample@store.com',
        connectedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      taxToSetAside: {
        totalAmount: 4892.73,
        currency: 'USD',
        periodDays: days,
        recommendedSavingsRate: 12.5,
        lastCalculated: new Date().toISOString(),
        breakdown: {
          federal: 0,
          state: 1247.35,
          local: 385.42,
          gst: 1456.83,
          pst: 892.67,
          hst: 758.94,
          qst: 151.52,
          other: 0
        },
        // Today's payout information
        todayPayoutAmount: todayPayout.payoutAmount,
        todayTaxAmount: todayPayout.taxToSetAside,
        todayBreakdown: {
          gst: todayPayout.taxBreakdown.gst,
          pst: todayPayout.taxBreakdown.pst,
          hst: todayPayout.taxBreakdown.hst,
          qst: todayPayout.taxBreakdown.qst,
          stateTax: todayPayout.taxBreakdown.stateTax,
          localTax: todayPayout.taxBreakdown.localTax,
          other: todayPayout.taxBreakdown.other
        },
        monthlyRollingTotal: monthlyTotal
      },

      summaryMetrics: {
        totalSales: 47892.55,
        totalTaxCollected: 4892.73,
        averageTaxRate: 10.2,
        orderCount: 156,
        taxableOrderCount: 148,
        exemptOrderCount: 8,
        averageOrderValue: 307.13,
        topSellingRegion: 'California',
        currency: 'USD'
      },

      taxBreakdown: [
        {
          category: 'GST',
          name: 'Goods & Services Tax (GST)',
          amount: 1456.83,
          rate: 5.0,
          applicableOrders: 45,
          totalTaxableAmount: 29136.60,
          jurisdiction: 'Canada',
          color: '#10b981'
        },
        {
          category: 'STATE_TAX',
          name: 'State Sales Tax',
          amount: 1247.35,
          rate: 8.5,
          applicableOrders: 67,
          totalTaxableAmount: 14674.71,
          jurisdiction: 'California',
          color: '#ef4444'
        },
        {
          category: 'PST',
          name: 'Provincial Sales Tax (PST)',
          amount: 892.67,
          rate: 7.0,
          applicableOrders: 34,
          totalTaxableAmount: 12752.43,
          jurisdiction: 'British Columbia',
          color: '#3b82f6'
        },
        {
          category: 'HST',
          name: 'Harmonized Sales Tax (HST)',
          amount: 758.94,
          rate: 13.0,
          applicableOrders: 28,
          totalTaxableAmount: 5838.77,
          jurisdiction: 'Ontario',
          color: '#8b5cf6'
        },
        {
          category: 'LOCAL_TAX',
          name: 'Local Tax',
          amount: 385.42,
          rate: 2.5,
          applicableOrders: 45,
          totalTaxableAmount: 15416.80,
          jurisdiction: 'Various',
          color: '#84cc16'
        },
        {
          category: 'QST',
          name: 'Quebec Sales Tax (QST)',
          amount: 151.52,
          rate: 9.975,
          applicableOrders: 12,
          totalTaxableAmount: 1519.45,
          jurisdiction: 'Quebec',
          color: '#f59e0b'
        }
      ],

      trendData: generateTrendData(days),
      recentOrders: generateRecentOrders(),
      jurisdictionData: generateJurisdictionData(),
      upcomingPayouts: payouts,

      periodComparison: {
        current: {
          totalSales: 47892.55,
          totalTax: 4892.73,
          orderCount: 156,
          averageOrderValue: 307.13,
          taxRate: 10.2,
          startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString()
        },
        previous: {
          totalSales: 41256.78,
          totalTax: 4203.45,
          orderCount: 134,
          averageOrderValue: 308.03,
          taxRate: 10.2,
          startDate: new Date(Date.now() - 2 * days * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: sampleData,
      lastUpdated: new Date().toISOString()
    })

  } catch (error) {
    console.error('Sample data API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function generateTrendData(days: number) {
  const data = []
  const now = new Date()

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const baseAmount = Math.random() * 1000 + 500
    const variation = 0.8 + Math.random() * 0.4 // ±20% variation

    data.push({
      date: date.toISOString().split('T')[0],
      totalSales: Math.round(baseAmount * variation * 100) / 100,
      taxCollected: Math.round(baseAmount * variation * 0.102 * 100) / 100,
      taxRate: 9.8 + Math.random() * 1.2, // 9.8% - 11%
      orderCount: Math.floor(Math.random() * 10) + 2,
      gst: Math.round(baseAmount * variation * 0.05 * 100) / 100,
      pst: Math.round(baseAmount * variation * 0.02 * 100) / 100,
      hst: Math.round(baseAmount * variation * 0.02 * 100) / 100,
      qst: Math.round(baseAmount * variation * 0.01 * 100) / 100,
      stateTax: Math.round(baseAmount * variation * 0.02 * 100) / 100,
      localTax: Math.round(baseAmount * variation * 0.005 * 100) / 100,
      other: 0
    })
  }

  return data
}

function generateRecentOrders() {
  const orders = []
  const now = new Date()
  
  const productNames = [
    'Premium Coffee Beans',
    'Artisan Chocolate Bar',
    'Organic Green Tea',
    'Handcrafted Soap Set',
    'Essential Oil Blend',
    'Natural Honey Jar',
    'Bamboo Travel Mug',
    'Eco-Friendly Tote Bag'
  ]

  const customers = [
    { name: 'Sarah Johnson', email: 'sarah.j@email.com' },
    { name: 'Michael Chen', email: 'mchen@example.com' },
    { name: 'Emily Rodriguez', email: 'emily.r@mail.com' },
    { name: 'David Thompson', email: 'dthompson@email.com' },
    null, null // Some orders without customer info
  ]

  const jurisdictions = [
    { country: 'US', state: 'California', city: 'San Francisco' },
    { country: 'CA', province: 'Ontario', city: 'Toronto' },
    { country: 'US', state: 'New York', city: 'New York' },
    { country: 'CA', province: 'British Columbia', city: 'Vancouver' },
    { country: 'US', state: 'Texas', city: 'Austin' }
  ]

  for (let i = 0; i < 20; i++) {
    const orderDate = new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000)
    const subtotal = Math.round((Math.random() * 400 + 50) * 100) / 100
    const taxRate = 8 + Math.random() * 5 // 8-13%
    const totalTax = Math.round(subtotal * (taxRate / 100) * 100) / 100
    const customer = customers[Math.floor(Math.random() * customers.length)]
    const jurisdiction = jurisdictions[Math.floor(Math.random() * jurisdictions.length)]
    
    const itemCount = Math.floor(Math.random() * 3) + 1
    const items = []
    
    for (let j = 0; j < itemCount; j++) {
      const productName = productNames[Math.floor(Math.random() * productNames.length)]
      const quantity = Math.floor(Math.random() * 3) + 1
      const unitPrice = Math.round((Math.random() * 80 + 20) * 100) / 100
      const totalPrice = Math.round(unitPrice * quantity * 100) / 100
      const itemTaxAmount = Math.round(totalPrice * (taxRate / 100) * 100) / 100
      
      items.push({
        id: `item-${i}-${j}`,
        productName,
        quantity,
        unitPrice,
        totalPrice,
        taxAmount: itemTaxAmount,
        taxable: Math.random() > 0.1 // 90% taxable
      })
    }

    orders.push({
      id: `order-${1000 + i}`,
      orderNumber: `${1000 + i}`,
      date: orderDate.toISOString(),
      subtotal,
      totalTax,
      totalAmount: subtotal + totalTax,
      currency: 'USD',
      customerName: customer?.name,
      customerEmail: customer?.email,
      taxBreakdown: {
        gst: jurisdiction.country === 'CA' ? Math.round(subtotal * 0.05 * 100) / 100 : 0,
        pst: jurisdiction.province === 'British Columbia' ? Math.round(subtotal * 0.07 * 100) / 100 : 0,
        hst: jurisdiction.province === 'Ontario' ? Math.round(subtotal * 0.13 * 100) / 100 : 0,
        qst: jurisdiction.province === 'Quebec' ? Math.round(subtotal * 0.09975 * 100) / 100 : 0,
        stateTax: jurisdiction.country === 'US' ? Math.round(subtotal * 0.08 * 100) / 100 : 0,
        localTax: jurisdiction.country === 'US' ? Math.round(subtotal * 0.02 * 100) / 100 : 0,
        other: 0
      },
      jurisdiction: {
        country: jurisdiction.country,
        province: jurisdiction.province,
        state: jurisdiction.state,
        city: jurisdiction.city,
        postalCode: jurisdiction.country === 'CA' ? 'M5V 3A8' : '90210'
      },
      items,
      taxExempt: Math.random() < 0.05, // 5% tax exempt
      exemptionReason: Math.random() < 0.05 ? 'Non-profit organization' : undefined
    })
  }

  return orders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

function generateJurisdictionData() {
  return [
    {
      jurisdiction: 'California, US',
      country: 'US',
      state: 'California',
      totalSales: 18456.32,
      totalTax: 1547.35,
      orderCount: 67,
      taxRate: 8.38,
      breakdown: {
        gst: 0,
        pst: 0,
        hst: 0,
        qst: 0,
        stateTax: 1247.35,
        localTax: 300.00,
        other: 0
      }
    },
    {
      jurisdiction: 'Ontario, Canada',
      country: 'CA',
      province: 'Ontario',
      totalSales: 12847.93,
      totalTax: 1670.23,
      orderCount: 45,
      taxRate: 13.0,
      breakdown: {
        gst: 0,
        pst: 0,
        hst: 1670.23,
        qst: 0,
        stateTax: 0,
        localTax: 0,
        other: 0
      }
    },
    {
      jurisdiction: 'British Columbia, Canada',
      country: 'CA',
      province: 'British Columbia',
      totalSales: 9823.45,
      totalTax: 1178.81,
      orderCount: 34,
      taxRate: 12.0,
      breakdown: {
        gst: 491.17,
        pst: 687.64,
        hst: 0,
        qst: 0,
        stateTax: 0,
        localTax: 0,
        other: 0
      }
    },
    {
      jurisdiction: 'New York, US',
      country: 'US',
      state: 'New York',
      totalSales: 6765.85,
      totalTax: 677.23,
      orderCount: 28,
      taxRate: 10.01,
      breakdown: {
        gst: 0,
        pst: 0,
        hst: 0,
        qst: 0,
        stateTax: 541.27,
        localTax: 135.96,
        other: 0
      }
    }
  ]
}

function generatePayoutData() {
  const today = new Date()
  const payouts = []
  
  // Generate 5 payouts (2 paid, 2 in transit, 1 pending)
  for (let i = 0; i < 5; i++) {
    const payoutDate = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
    const ordersCount = Math.floor(Math.random() * 15) + 5
    const grossSales = Math.round((Math.random() * 3000 + 1000) * 100) / 100
    const fees = Math.round(grossSales * 0.029 * 100) / 100 // 2.9% processing fee
    const refunds = i === 2 ? Math.round((Math.random() * 200 + 50) * 100) / 100 : 0
    const taxRate = 0.08 + Math.random() * 0.05 // 8-13% tax rate
    const taxCollected = Math.round(grossSales * taxRate * 100) / 100
    const payoutAmount = grossSales - fees - refunds
    
    // Generate tax breakdown
    const isCanadian = Math.random() > 0.5
    const taxBreakdown = {
      gst: isCanadian ? Math.round(grossSales * 0.05 * 100) / 100 : 0,
      pst: isCanadian ? Math.round(grossSales * 0.07 * 100) / 100 : 0,
      hst: 0,
      qst: 0,
      stateTax: !isCanadian ? Math.round(grossSales * 0.065 * 100) / 100 : 0,
      localTax: !isCanadian ? Math.round(grossSales * 0.02 * 100) / 100 : 0,
      other: 0
    }
    
    // Generate sample orders for this payout
    const orders = []
    for (let j = 0; j < Math.min(ordersCount, 5); j++) {
      const orderAmount = Math.round((grossSales / ordersCount) * 100) / 100
      const orderTax = Math.round(orderAmount * taxRate * 100) / 100
      orders.push({
        orderNumber: `#${1000 + i * 20 + j}`,
        amount: orderAmount,
        tax: orderTax,
        customer: ['Sarah J.', 'Mike Chen', 'Emily R.', 'David T.', 'Lisa K.'][j] || 'Customer'
      })
    }
    
    let status: 'pending' | 'in_transit' | 'paid'
    let estimatedArrival
    
    if (i < 2) {
      status = 'paid'
    } else if (i < 4) {
      status = 'in_transit'
      estimatedArrival = new Date(today.getTime() + (i - 2) * 24 * 60 * 60 * 1000).toISOString()
    } else {
      status = 'pending'
      estimatedArrival = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString()
    }
    
    payouts.push({
      payoutDate: payoutDate.toISOString(),
      payoutAmount,
      ordersCount,
      grossSales,
      fees,
      refunds,
      taxCollected,
      taxToSetAside: taxCollected,
      taxBreakdown,
      orders,
      status,
      estimatedArrival
    })
  }
  
  return payouts.sort((a, b) => new Date(b.payoutDate).getTime() - new Date(a.payoutDate).getTime())
}