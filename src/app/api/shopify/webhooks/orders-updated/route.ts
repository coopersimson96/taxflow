import { NextRequest, NextResponse } from 'next/server'
import { ShopifyService } from '@/lib/services/shopify-service'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // Get raw body for HMAC verification
    const rawBody = await request.text()
    const hmacHeader = request.headers.get('x-shopify-hmac-sha256')
    const shop = request.headers.get('x-shopify-shop-domain')

    if (!hmacHeader || !shop) {
      return NextResponse.json({ error: 'Missing headers' }, { status: 400 })
    }

    // Verify webhook authenticity
    if (!ShopifyService.verifyWebhookHmac(rawBody, hmacHeader)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const orderData = JSON.parse(rawBody)
    
    console.log(`📝 Order updated from ${shop}:`, {
      orderId: orderData.id,
      orderNumber: orderData.order_number
    })

    // Find existing transaction
    const transaction = await prisma.transaction.findFirst({
      where: {
        externalId: orderData.id.toString(),
        integration: {
          type: 'SHOPIFY',
          credentials: {
            path: ['shop'],
            equals: shop.replace('.myshopify.com', '')
          }
        }
      }
    })

    if (!transaction) {
      console.log('Transaction not found, treating as new order')
      // Could redirect to orders-create handler or create new transaction
      return NextResponse.json({ success: true, action: 'not_found' })
    }

    // Update existing transaction
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: getTransactionStatus(orderData.fulfillment_status, orderData.financial_status),
        subtotal: Math.round((parseFloat(orderData.subtotal_price || '0')) * 100),
        taxAmount: Math.round((parseFloat(orderData.total_tax || '0')) * 100),
        totalAmount: Math.round((parseFloat(orderData.total_price || '0')) * 100),
        discountAmount: Math.round((parseFloat(orderData.total_discounts || '0')) * 100),
        taxDetails: orderData.tax_lines || [],
        updatedAt: new Date(),
        metadata: {
          ...transaction.metadata as any,
          fulfillmentStatus: orderData.fulfillment_status,
          financialStatus: orderData.financial_status,
          lastUpdated: new Date().toISOString()
        }
      }
    })

    console.log(`✅ Transaction updated: ${transaction.id}`)

    return NextResponse.json({ success: true, transactionId: transaction.id })

  } catch (error) {
    console.error('Orders updated webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

function getTransactionStatus(fulfillmentStatus: string, financialStatus: string): 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'FAILED' | 'REFUNDED' {
  if (financialStatus === 'refunded' || financialStatus === 'partially_refunded') {
    return 'REFUNDED'
  }
  
  if (financialStatus === 'voided') {
    return 'CANCELLED'
  }
  
  if (financialStatus === 'paid') {
    return 'COMPLETED'
  }
  
  if (financialStatus === 'pending') {
    return 'PENDING'
  }
  
  return 'PENDING'
}