import { NextRequest, NextResponse } from 'next/server'
import { ShopifyService } from '@/lib/services/shopify-service'
import { prisma, withWebhookDb } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Unified Shopify Webhook Endpoint v3.0',
    method: 'POST',
    description: 'This endpoint handles all Shopify webhook events',
    supportedTopics: [
      'orders/create',
      'orders/updated', 
      'orders/cancelled',
      'refunds/create',
      'app/uninstalled'
    ],
    timestamp: new Date().toISOString(),
    status: 'active'
  })
}

export async function POST(request: NextRequest) {
  console.log('🚀 === UNIFIED SHOPIFY WEBHOOK HANDLER v3.0 ENTRY ===')
  console.log('🚀 Webhook received at:', new Date().toISOString())
  console.log('🚀 Request method:', request.method)
  console.log('🚀 Request URL:', request.url)
  
  try {
    // Get all headers for debugging
    const headers = Object.fromEntries(request.headers.entries())
    console.log('🚀 All request headers:', headers)
    
    // Get webhook topic from headers
    const topic = request.headers.get('x-shopify-topic')
    const hmacHeader = request.headers.get('x-shopify-hmac-sha256')
    const shop = request.headers.get('x-shopify-shop-domain')
    
    console.log('🚀 Webhook details:', { topic, shop, hasHmac: !!hmacHeader })
    console.log('🚀 HMAC header value:', hmacHeader)

    if (!topic || !hmacHeader || !shop) {
      console.error('🚨 Missing required webhook headers:')
      console.error('- topic:', topic)
      console.error('- hmacHeader:', !!hmacHeader)
      console.error('- shop:', shop)
      return NextResponse.json({ error: 'Missing headers' }, { status: 400 })
    }

    console.log('🚀 Headers validation passed - getting request body...')
    
    // Get raw body for HMAC verification
    const rawBody = await request.text()
    console.log('🚀 Webhook payload size:', rawBody.length)
    console.log('🚀 Webhook payload preview:', rawBody.substring(0, 200))

    // Verify webhook authenticity
    console.log('Attempting HMAC verification...')
    console.log('HMAC Header present:', !!hmacHeader)
    console.log('Webhook secret configured:', !!process.env.SHOPIFY_WEBHOOK_SECRET)
    
    try {
      console.log('Raw body (first 100 chars):', rawBody.substring(0, 100))
      console.log('HMAC header (first 20 chars):', hmacHeader?.substring(0, 20))
      
      // Re-enabled HMAC verification
      const isValid = ShopifyService.verifyWebhookHmac(rawBody, hmacHeader)
      console.log('HMAC verification result:', isValid)
      
      if (!isValid) {
        console.error('❌ Invalid webhook HMAC signature')
        console.error('Expected webhook secret configured:', !!process.env.SHOPIFY_WEBHOOK_SECRET)
        console.error('Webhook secret value (first 10 chars):', process.env.SHOPIFY_WEBHOOK_SECRET?.substring(0, 10))
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
      
      console.log('✅ HMAC verification successful - proceeding with webhook processing')
    } catch (hmacError) {
      console.error('HMAC verification error:', hmacError)
      return NextResponse.json({ error: 'HMAC verification failed' }, { status: 401 })
    }

    // Route to appropriate handler based on topic
    switch (topic) {
      case 'orders/create':
        return await handleOrderCreate(JSON.parse(rawBody), shop)
      
      case 'orders/updated':
        return await handleOrderUpdated(JSON.parse(rawBody), shop)
      
      case 'orders/cancelled':
        return await handleOrderCancelled(JSON.parse(rawBody), shop)
      
      case 'refunds/create':
        return await handleOrderRefunded(JSON.parse(rawBody), shop)
      
      case 'app/uninstalled':
        return await handleAppUninstalled(JSON.parse(rawBody), shop)
      
      default:
        console.log(`Unhandled webhook topic: ${topic}`)
        return NextResponse.json({ 
          success: true, 
          message: `Webhook topic ${topic} acknowledged but not processed` 
        })
    }

  } catch (error) {
    console.error('Unified webhook handler error:', error)
    return NextResponse.json({
      error: 'Webhook processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Order Create Handler
async function handleOrderCreate(orderData: any, shop: string) {
  console.log(`📦 New order from ${shop}:`, {
    orderId: orderData.id,
    orderNumber: orderData.order_number,
    totalPrice: orderData.total_price,
    totalTax: orderData.total_tax
  })

  const integration = await findIntegration(shop)
  if (!integration) {
    return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
  }

  const transaction = await prisma.transaction.upsert({
    where: {
      organizationId_integrationId_externalId: {
        organizationId: integration.organizationId,
        integrationId: integration.id,
        externalId: orderData.id.toString()
      }
    },
    update: {
      // Update existing transaction with latest data
      orderNumber: orderData.order_number?.toString(),
      type: 'SALE',
      status: getTransactionStatus(orderData.fulfillment_status, orderData.financial_status),
      currency: orderData.currency || 'USD',
      subtotal: Math.round((parseFloat(orderData.subtotal_price || '0')) * 100),
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
    },
    create: {
      organizationId: integration.organizationId,
      integrationId: integration.id,
      externalId: orderData.id.toString(),
      orderNumber: orderData.order_number?.toString(),
      type: 'SALE',
      status: getTransactionStatus(orderData.fulfillment_status, orderData.financial_status),
      currency: orderData.currency || 'USD',
      subtotal: Math.round((parseFloat(orderData.subtotal_price || '0')) * 100),
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

  await updateIntegrationSync(integration.id)

  console.log(`✅ Order create processed:`, transaction.id)
  return NextResponse.json({ success: true, transactionId: transaction.id })
}

// Order Updated Handler
async function handleOrderUpdated(orderData: any, shop: string) {
  console.log(`📝 Order updated from ${shop}:`, {
    orderId: orderData.id,
    orderNumber: orderData.order_number,
    financialStatus: orderData.financial_status
  })

  const integration = await findIntegration(shop)
  if (!integration) {
    return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
  }

  const existingTransaction = await prisma.transaction.findFirst({
    where: {
      organizationId: integration.organizationId,
      integrationId: integration.id,
      externalId: orderData.id.toString()
    }
  })

  if (!existingTransaction) {
    // Create new transaction if it doesn't exist
    return await handleOrderCreate(orderData, shop)
  }

  // Update existing transaction
  const updatedTransaction = await prisma.transaction.update({
    where: { id: existingTransaction.id },
    data: {
      status: getTransactionStatus(orderData.fulfillment_status, orderData.financial_status),
      subtotal: Math.round((parseFloat(orderData.subtotal_price || '0')) * 100),
      taxAmount: Math.round((parseFloat(orderData.total_tax || '0')) * 100),
      totalAmount: Math.round((parseFloat(orderData.total_price || '0')) * 100),
      taxDetails: orderData.tax_lines || [],
      metadata: {
        ...existingTransaction.metadata as any,
        fulfillmentStatus: orderData.fulfillment_status,
        financialStatus: orderData.financial_status,
        lastUpdated: new Date().toISOString()
      },
      updatedAt: new Date()
    }
  })

  await updateIntegrationSync(integration.id)

  console.log(`✅ Order update processed:`, updatedTransaction.id)
  return NextResponse.json({ success: true, transactionId: updatedTransaction.id })
}

// Order Cancelled Handler
async function handleOrderCancelled(orderData: any, shop: string) {
  console.log(`❌ Order cancelled from ${shop}:`, {
    orderId: orderData.id,
    orderNumber: orderData.order_number,
    cancelReason: orderData.cancel_reason
  })

  const integration = await findIntegration(shop)
  if (!integration) {
    return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
  }

  const result = await prisma.transaction.updateMany({
    where: {
      organizationId: integration.organizationId,
      integrationId: integration.id,
      externalId: orderData.id.toString()
    },
    data: {
      status: 'CANCELLED',
      updatedAt: new Date(),
      notes: `Order cancelled: ${orderData.cancel_reason || 'No reason provided'}`
    }
  })

  await updateIntegrationSync(integration.id)

  console.log(`✅ Order cancellation processed: ${result.count} transactions`)
  return NextResponse.json({ success: true, updatedCount: result.count })
}

// Order Refunded Handler
async function handleOrderRefunded(orderData: any, shop: string) {
  console.log(`💰 Order refunded from ${shop}:`, {
    orderId: orderData.id,
    orderNumber: orderData.order_number,
    refunds: orderData.refunds?.length || 0
  })

  const integration = await findIntegration(shop)
  if (!integration) {
    return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
  }

  const originalTransaction = await prisma.transaction.findFirst({
    where: {
      organizationId: integration.organizationId,
      integrationId: integration.id,
      externalId: orderData.id.toString()
    }
  })

  if (!originalTransaction) {
    console.log('Original transaction not found for refund')
    return NextResponse.json({ success: true, action: 'original_not_found' })
  }

  // Create refund transactions
  const refunds = orderData.refunds || []
  const createdRefunds = []

  for (const refund of refunds) {
    try {
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
          subtotal: -refundAmount + refundTaxAmount,
          taxAmount: -refundTaxAmount,
          totalAmount: -refundAmount,
          customerEmail: originalTransaction.customerEmail,
          customerName: originalTransaction.customerName,
          transactionDate: new Date(refund.created_at || new Date()),
          metadata: {
            originalTransactionId: originalTransaction.id,
            shopifyRefundId: refund.id,
            refundReason: refund.note
          },
          notes: `Refund for order ${originalTransaction.orderNumber}`
        }
      })

      createdRefunds.push(refundTransaction.id)
    } catch (refundError) {
      console.error(`Failed to create refund transaction:`, refundError)
    }
  }

  // Update original transaction
  const totalRefunded = refunds.reduce((sum: number, refund: any) => 
    sum + parseFloat(refund.transactions?.[0]?.amount || '0'), 0
  )
  
  const isFullRefund = Math.abs(totalRefunded - (originalTransaction.totalAmount / 100)) < 0.01

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

  await updateIntegrationSync(integration.id)

  console.log(`✅ Refund processed: ${createdRefunds.length} transactions`)
  return NextResponse.json({ 
    success: true, 
    refundTransactionIds: createdRefunds,
    originalTransactionId: originalTransaction.id
  })
}

// App Uninstalled Handler
async function handleAppUninstalled(appData: any, shop: string) {
  console.log(`🗑️ App uninstalled from ${shop}`)

  const integration = await findIntegration(shop)
  if (!integration) {
    return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
  }

  const updatedIntegration = await prisma.integration.update({
    where: { id: integration.id },
    data: {
      status: 'DISCONNECTED',
      syncStatus: 'IDLE',
      syncError: 'App uninstalled by user',
      lastSyncAt: new Date(),
      config: {
        ...(((integration as any).config) || {}),
        uninstalledAt: new Date().toISOString(),
        uninstallReason: 'user_initiated'
      },
      updatedAt: new Date()
    } as any
  })

  // Create notification
  try {
    await prisma.notification.create({
      data: {
        organizationId: integration.organizationId,
        title: 'Shopify App Uninstalled',
        message: `The Shopify integration for ${shop} has been uninstalled.`,
        type: 'INTEGRATION_DISCONNECTED',
        priority: 'HIGH',
        status: 'PENDING',
        metadata: { shop: shop, integrationId: integration.id }
      }
    })
  } catch (notificationError) {
    console.error('Failed to create uninstall notification:', notificationError)
  }

  console.log(`✅ App uninstall processed:`, updatedIntegration.id)
  return NextResponse.json({ 
    success: true, 
    integrationId: updatedIntegration.id,
    action: 'disconnected'
  })
}

// Helper Functions
async function findIntegration(shop: string) {
  return await withWebhookDb(async (client) => {
    return await client.integration.findFirst({
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
  })
}

async function updateIntegrationSync(integrationId: string) {
  await withWebhookDb(async (client) => {
    return await client.integration.update({
      where: { id: integrationId },
      data: {
        lastSyncAt: new Date(),
        syncStatus: 'SUCCESS'
      }
    })
  })
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