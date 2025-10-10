import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Force this route to be dynamic
export const dynamic = 'force-dynamic'

interface DailyPayoutData {
  payoutAmount: number
  taxToSetAside: number
  safeToSpend: number
  orderCount: number
  currency: string
  date: string
  dateRange: string
  isSetAside: boolean
  hasPayoutToday: boolean
  payoutId?: string
}

/**
 * Fetches daily payout data from Shopify
 * This provides a clean abstraction that works with both sample and real data
 */
async function fetchShopifyDailyPayout(integration: any): Promise<DailyPayoutData | null> {
  try {
    const { shop: shopDomain, accessToken } = integration.credentials as any
    
    // Check for payment processing scope
    if (!integration.scopes?.includes('read_shopify_payments_payouts')) {
      console.log('⚠️ Payment scope not available')
      return null
    }

    // Fetch today's payouts from Shopify
    const today = new Date()
    const startOfDay = new Date(today.setHours(0, 0, 0, 0))
    const endOfDay = new Date(today.setHours(23, 59, 59, 999))
    
    const payoutUrl = `https://${shopDomain}/admin/api/2024-01/shopify_payments/payouts.json?` +
      `date_min=${startOfDay.toISOString()}&date_max=${endOfDay.toISOString()}&status=paid`
    
    const response = await fetch(payoutUrl, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      console.error('❌ Shopify API error:', response.status)
      return null
    }

    const data = await response.json()
    const todayPayout = data.payouts?.[0]
    
    if (!todayPayout) {
      return null
    }

    // Calculate tax from associated transactions
    // This would need additional API calls to get order details
    // For now, return basic payout info
    const payoutAmount = parseFloat(todayPayout.amount)
    const estimatedTaxRate = 0.10 // 10% estimated until we fetch real order data
    const taxToSetAside = payoutAmount * estimatedTaxRate
    
    return {
      payoutAmount,
      taxToSetAside,
      safeToSpend: payoutAmount - taxToSetAside,
      orderCount: 0, // Would need to fetch associated orders
      currency: todayPayout.currency,
      date: new Date(todayPayout.date).toLocaleDateString(),
      dateRange: 'Today',
      isSetAside: false,
      hasPayoutToday: true,
      payoutId: todayPayout.id.toString()
    }
    
  } catch (error) {
    console.error('Error fetching Shopify payout:', error)
    return null
  }
}

/**
 * Generates sample payout data for development
 */
function generateSampleDailyPayout(date: Date = new Date()): DailyPayoutData {
  const seed = date.getDate()
  const baseAmount = 1500 + (seed * 47) % 1000
  const taxRate = 0.08 + (seed * 0.01) % 0.05
  
  const payoutAmount = Math.round(baseAmount * 100) / 100
  const taxToSetAside = Math.round(payoutAmount * taxRate * 100) / 100
  const safeToSpend = payoutAmount - taxToSetAside
  const orderCount = 8 + (seed % 12)
  
  return {
    payoutAmount,
    taxToSetAside,
    safeToSpend,
    orderCount,
    currency: 'USD',
    date: date.toLocaleDateString(),
    dateRange: 'Today',
    isSetAside: false,
    hasPayoutToday: true,
    payoutId: `sample_${date.toISOString().split('T')[0]}`
  }
}

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find user's organization and integration
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        organizations: {
          include: {
            integrations: {
              where: { type: 'SHOPIFY', status: 'CONNECTED' }
            }
          }
        }
      }
    })

    const organization = user?.organizations?.[0]
    const integration = organization?.integrations?.[0]

    // Check if we're in sample data mode
    if (process.env.USE_SAMPLE_DATA === 'true') {
      console.log('🎲 Using sample data for daily payout')
      const data = generateSampleDailyPayout()
      
      // Check if this payout has been marked as set aside in session storage
      // In production, this would check the database
      return NextResponse.json({ 
        success: true, 
        data,
        mode: 'sample'
      })
    }

    // PRODUCTION MODE: Check for real Shopify integration
    if (!integration) {
      return NextResponse.json({ 
        success: true, 
        data: {
          hasPayoutToday: false,
          currency: 'USD',
          date: new Date().toLocaleDateString(),
          dateRange: 'Today'
        },
        mode: 'production',
        message: 'No Shopify store connected'
      })
    }

    // Fetch real payout data from Shopify
    const payoutData = await fetchShopifyDailyPayout(integration)
    
    if (!payoutData) {
      return NextResponse.json({ 
        success: true, 
        data: {
          hasPayoutToday: false,
          currency: organization.currency || 'USD',
          date: new Date().toLocaleDateString(),
          dateRange: 'Today'
        },
        mode: 'production'
      })
    }

    // Check if payout has been marked as set aside in database
    const payoutStatus = await prisma.transaction.findFirst({
      where: {
        organizationId: organization.id,
        payoutId: payoutData.payoutId,
        metadata: {
          path: '$.payoutSetAside',
          equals: true
        }
      }
    })
    
    payoutData.isSetAside = !!payoutStatus

    return NextResponse.json({ 
      success: true, 
      data: payoutData,
      mode: 'production'
    })

  } catch (error) {
    console.error('Daily payout API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, payoutId, payoutDate } = await request.json()
    
    if (!action || (!payoutId && !payoutDate)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate action
    if (!['confirm_set_aside', 'undo_set_aside'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // In sample mode, just return success
    if (process.env.USE_SAMPLE_DATA === 'true') {
      console.log('🎲 Sample mode: simulating payout status update')
      return NextResponse.json({ 
        success: true, 
        action,
        payoutId,
        payoutDate,
        timestamp: new Date().toISOString(),
        mode: 'sample'
      })
    }

    // PRODUCTION MODE: Update database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        organizations: true
      }
    })

    if (!user?.organizations?.[0]) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    const organization = user.organizations[0]
    
    if (action === 'confirm_set_aside') {
      // Mark payout as set aside
      await prisma.transaction.updateMany({
        where: {
          organizationId: organization.id,
          payoutId: payoutId
        },
        data: {
          metadata: {
            payoutSetAside: true,
            setAsideTimestamp: new Date().toISOString(),
            setAsideBy: session.user.email
          }
        }
      })
    } else {
      // Undo set aside
      await prisma.transaction.updateMany({
        where: {
          organizationId: organization.id,
          payoutId: payoutId
        },
        data: {
          metadata: {
            payoutSetAside: false,
            undoTimestamp: new Date().toISOString(),
            undoBy: session.user.email
          }
        }
      })
    }
    
    return NextResponse.json({ 
      success: true, 
      action,
      payoutId,
      timestamp: new Date().toISOString(),
      mode: 'production'
    })

  } catch (error) {
    console.error('Payout status update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}