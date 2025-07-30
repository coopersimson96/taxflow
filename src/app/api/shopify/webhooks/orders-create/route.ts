import { NextRequest, NextResponse } from 'next/server'
import { ShopifyService } from '@/lib/services/shopify-service'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // Get raw body for HMAC verification
    const rawBody = await request.text()
    const hmacHeader = request.headers.get('x-shopify-hmac-sha256')
    const shop = request.headers.get('x-shopify-shop-domain')
    const topic = request.headers.get('x-shopify-topic')

    if (!hmacHeader || !shop) {
      console.error('Missing required webhook headers')
      return NextResponse.json({ error: 'Missing headers' }, { status: 400 })
    }

    // Verify webhook authenticity
    if (!ShopifyService.verifyWebhookHmac(rawBody, hmacHeader)) {
      console.error('Invalid webhook HMAC signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Parse order data
    const orderData = JSON.parse(rawBody)
    
    console.log(`📦 New order received from ${shop}:`, {
      orderId: orderData.id,
      orderNumber: orderData.order_number,
      totalPrice: orderData.total_price,
      totalTax: orderData.total_tax
    })

    // Find the integration
    const integration = await prisma.integration.findFirst({
      where: {
        type: 'SHOPIFY',
        credentials: {
          path: ['shop'],
          equals: shop.replace('.myshopify.com', '')
        }
      },
      include: {
        organization: true
      }
    })

    if (!integration) {
      console.error('Integration not found for shop:', shop)
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    // Process order and create transaction record
    const transaction = await prisma.transaction.create({
      data: {
        organizationId: integration.organizationId,
        integrationId: integration.id,
        externalId: orderData.id.toString(),
        orderNumber: orderData.order_number?.toString(),
        type: 'SALE',
        status: getTransactionStatus(orderData.fulfillment_status, orderData.financial_status),
        currency: orderData.currency || 'USD',
        subtotal: Math.round((parseFloat(orderData.subtotal_price || '0')) * 100), // Convert to cents
        taxAmount: Math.round((parseFloat(orderData.total_tax || '0')) * 100),
        totalAmount: Math.round((parseFloat(orderData.total_price || '0')) * 100),
        discountAmount: Math.round((parseFloat(orderData.total_discounts || '0')) * 100),
        shippingAmount: Math.round((parseFloat(orderData.shipping_lines?.[0]?.price || '0')) * 100),
        taxDetails: orderData.tax_lines || [],
        customerEmail: orderData.customer?.email,
        customerName: orderData.customer ? 
          `${orderData.customer.first_name || ''} ${orderData.customer.last_name || ''}`.trim() : 
          null,
        billingAddress: orderData.billing_address,
        shippingAddress: orderData.shipping_address,
        items: orderData.line_items?.map((item: any) => ({
          id: item.id,
          productId: item.product_id,
          variantId: item.variant_id,
          title: item.title,
          quantity: item.quantity,
          price: item.price,
          totalDiscount: item.total_discount
        })) || [],
        transactionDate: new Date(orderData.created_at),
        metadata: {
          shopifyOrderId: orderData.id,
          fulfillmentStatus: orderData.fulfillment_status,
          financialStatus: orderData.financial_status,
          gateway: orderData.gateway,
          sourceIdentifier: orderData.source_identifier
        }
      }
    })

    console.log(`✅ Transaction created:`, {
      id: transaction.id,
      orderNumber: transaction.orderNumber,
      taxAmount: transaction.taxAmount / 100 // Convert back to dollars for logging
    })

    // Update integration sync status
    await prisma.integration.update({
      where: { id: integration.id },
      data: {
        lastSyncAt: new Date(),
        syncStatus: 'SUCCESS'
      }
    })

    return NextResponse.json({ success: true, transactionId: transaction.id })

  } catch (error) {
    console.error('Orders create webhook error:', error)
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