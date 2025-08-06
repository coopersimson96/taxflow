import { NextRequest, NextResponse } from 'next/server'
import { ShopifyService } from '@/lib/services/shopify-service'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const hmacHeader = request.headers.get('x-shopify-hmac-sha256')
    const shop = request.headers.get('x-shopify-shop-domain')

    if (!hmacHeader || !shop) {
      return NextResponse.json({ error: 'Missing headers' }, { status: 400 })
    }

    if (!ShopifyService.verifyWebhookHmac(rawBody, hmacHeader)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const orderData = JSON.parse(rawBody)
    
    console.log(`💰 Order refunded from ${shop}:`, {
      orderId: orderData.id,
      orderNumber: orderData.order_number,
      totalRefunded: orderData.refunds?.reduce((sum: number, refund: any) => 
        sum + parseFloat(refund.transactions?.[0]?.amount || '0'), 0
      )
    })

    // Find the original transaction
    const originalTransaction = await prisma.transaction.findFirst({
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

    if (!originalTransaction) {
      console.log('Original transaction not found for refund')
      return NextResponse.json({ success: true, action: 'original_not_found' })
    }

    // Create refund transactions for each refund
    const refunds = orderData.refunds || []
    const createdRefunds = []

    for (const refund of refunds) {
      const refundAmount = Math.round((parseFloat(refund.transactions?.[0]?.amount || '0')) * 100)
      const refundTaxAmount = Math.round(
        (refund.refund_line_items?.reduce((sum: number, item: any) => 
          sum + parseFloat(item.total_tax || '0'), 0) || 0) * 100
      )

      const refundTransaction = await prisma.transaction.create({
        data: {
          organizationId: originalTransaction.organizationId,
          integrationId: originalTransaction.integrationId,
          externalId: `refund-${refund.id}`,
          orderNumber: originalTransaction.orderNumber,
          type: refundAmount === originalTransaction.totalAmount ? 'REFUND' : 'PARTIAL_REFUND',
          status: 'COMPLETED',
          currency: originalTransaction.currency,
          subtotal: -refundAmount + refundTaxAmount, // Negative for refund
          taxAmount: -refundTaxAmount, // Negative for refund
          totalAmount: -refundAmount, // Negative for refund
          customerEmail: originalTransaction.customerEmail,
          customerName: originalTransaction.customerName,
          transactionDate: new Date(refund.created_at || new Date()),
          metadata: {
            originalTransactionId: originalTransaction.id,
            shopifyRefundId: refund.id,
            refundReason: refund.note,
            refundLineItems: refund.refund_line_items
          },
          notes: `Refund for order ${originalTransaction.orderNumber}`
        }
      })

      createdRefunds.push(refundTransaction.id)
    }

    // Update original transaction status
    const totalRefunded = refunds.reduce((sum: number, refund: any) => 
      sum + parseFloat(refund.transactions?.[0]?.amount || '0'), 0
    )
    
    const originalAmount = originalTransaction.totalAmount / 100
    const isFullRefund = Math.abs(totalRefunded - originalAmount) < 0.01

    await prisma.transaction.update({
      where: { id: originalTransaction.id },
      data: {
        status: isFullRefund ? 'REFUNDED' : 'COMPLETED',
        updatedAt: new Date(),
        metadata: {
          ...originalTransaction.metadata as any,
          refunded: true,
          totalRefunded: totalRefunded,
          refundTransactionIds: createdRefunds
        }
      }
    })

    console.log(`✅ Created ${createdRefunds.length} refund transaction(s)`)

    return NextResponse.json({ 
      success: true, 
      refundTransactionIds: createdRefunds,
      originalTransactionId: originalTransaction.id
    })

  } catch (error) {
    console.error('Orders refunded webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}