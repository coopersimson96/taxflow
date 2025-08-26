import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { withWebhookDb } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Verify Shopify webhook
function verifyWebhook(rawBody: string, signature: string): boolean {
  const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET
  if (!webhookSecret) return false

  const hash = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody, 'utf8')
    .digest('base64')

  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature))
}

// Handle customer data request (GDPR)
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-shopify-hmac-sha256') || ''
    
    if (!verifyWebhook(rawBody, signature)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = JSON.parse(rawBody)
    const topic = request.headers.get('x-shopify-topic')
    
    console.log(`📊 GDPR webhook received: ${topic}`)

    switch (topic) {
      case 'customers/redact':
        // Delete customer data from your database
        await handleCustomerRedact(data)
        break
        
      case 'customers/data_request':
        // Provide customer data (usually email shop owner)
        await handleCustomerDataRequest(data)
        break
        
      case 'shop/redact':
        // Delete all shop data after app uninstall
        await handleShopRedact(data)
        break
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('GDPR webhook error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

async function handleCustomerRedact(data: any) {
  const { shop_domain, customer } = data
  
  // Delete customer-specific data from transactions
  await withWebhookDb(async (db) => {
    // First find the integration
    const integration = await db.integration.findFirst({
      where: {
        type: 'SHOPIFY',
        credentials: {
          path: ['shop'],
          equals: shop_domain
        }
      }
    })

    if (integration) {
      await db.transaction.updateMany({
        where: {
          integrationId: integration.id,
          customerEmail: customer.email
        },
        data: {
          customerName: 'REDACTED',
          customerEmail: 'REDACTED',
          metadata: {}
        }
      })
    }
  })
  
  console.log(`✅ Customer data redacted for ${customer.email} from ${shop_domain}`)
}

async function handleCustomerDataRequest(data: any) {
  const { shop_domain, customer } = data
  
  // In production, you would email this data to the shop owner
  const customerData = await withWebhookDb(async (db) => {
    // First find the integration
    const integration = await db.integration.findFirst({
      where: {
        type: 'SHOPIFY',
        credentials: {
          path: ['shop'],
          equals: shop_domain
        }
      }
    })

    if (!integration) return []

    return await db.transaction.findMany({
      where: {
        integrationId: integration.id,
        customerEmail: customer.email
      },
      select: {
        id: true,
        totalAmount: true,
        transactionDate: true,
        taxAmount: true,
        orderNumber: true
      }
    })
  })
  
  console.log(`📤 Customer data requested for ${customer.email}:`, customerData.length, 'records')
  // TODO: Implement email to shop owner with customer data
}

async function handleShopRedact(data: any) {
  const { shop_domain } = data
  
  // Delete all data for this shop
  await withWebhookDb(async (db) => {
    // Find integration
    const integration = await db.integration.findFirst({
      where: {
        type: 'SHOPIFY',
        credentials: {
          path: ['shop'],
          equals: shop_domain
        }
      }
    })
    
    if (integration) {
      // Delete all transactions
      await db.transaction.deleteMany({
        where: { integrationId: integration.id }
      })
      
      // Delete integration
      await db.integration.delete({
        where: { id: integration.id }
      })
    }
  })
  
  console.log(`🗑️ All data deleted for shop: ${shop_domain}`)
}