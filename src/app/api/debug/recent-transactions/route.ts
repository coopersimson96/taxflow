import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    console.log('Fetching recent transactions from database...')
    
    // Get recent transactions with integration details
    const transactions = await prisma.transaction.findMany({
      take: 10,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        integration: {
          select: {
            id: true,
            type: true,
            name: true,
            credentials: true
          }
        },
        organization: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    console.log(`Found ${transactions.length} recent transactions`)

    const formattedTransactions = transactions.map(t => ({
      id: t.id,
      orderNumber: t.orderNumber,
      externalId: t.externalId,
      type: t.type,
      status: t.status,
      currency: t.currency,
      totalAmount: (t.totalAmount / 100).toFixed(2),
      taxAmount: (t.taxAmount / 100).toFixed(2),
      subtotal: (t.subtotal / 100).toFixed(2),
      customerEmail: t.customerEmail,
      customerName: t.customerName,
      transactionDate: t.transactionDate,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      integration: {
        type: t.integration.type,
        name: t.integration.name,
        shop: (t.integration.credentials as any)?.shop
      },
      organization: t.organization.name,
      taxDetails: t.taxDetails,
      items: t.items,
      metadata: t.metadata,
      notes: t.notes
    }))

    return NextResponse.json({
      success: true,
      transactionCount: transactions.length,
      transactions: formattedTransactions,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Recent transactions error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}