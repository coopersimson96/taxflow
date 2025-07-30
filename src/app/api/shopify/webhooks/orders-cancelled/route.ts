import { NextRequest, NextResponse } from 'next/server'
import { ShopifyService } from '@/lib/services/shopify-service'
import { prisma } from '@/lib/prisma'

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
    
    console.log(`❌ Order cancelled from ${shop}:`, {
      orderId: orderData.id,
      orderNumber: orderData.order_number
    })

    // Update transaction status to cancelled
    const transaction = await prisma.transaction.updateMany({
      where: {
        externalId: orderData.id.toString(),
        integration: {
          type: 'SHOPIFY',
          credentials: {
            path: ['shop'],
            equals: shop.replace('.myshopify.com', '')
          }
        }
      },
      data: {
        status: 'CANCELLED',
        updatedAt: new Date(),
        notes: 'Order cancelled in Shopify'
      }
    })

    console.log(`✅ Transaction(s) marked as cancelled: ${transaction.count}`)

    return NextResponse.json({ success: true, updatedCount: transaction.count })

  } catch (error) {
    console.error('Orders cancelled webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}