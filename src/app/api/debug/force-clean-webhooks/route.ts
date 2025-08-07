import { NextRequest, NextResponse } from 'next/server'
import { ShopifyService } from '@/lib/services/shopify-service'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    console.log('🧹 Starting FORCE webhook cleanup...')
    
    // Hard-coded values for your test store
    const shop = 'taxflow-test'
    const shopifyApiKey = process.env.SHOPIFY_API_KEY
    const shopifyApiSecret = process.env.SHOPIFY_API_SECRET
    
    if (!shopifyApiKey || !shopifyApiSecret) {
      return NextResponse.json({
        success: false,
        error: 'Missing Shopify API credentials'
      })
    }

    // Get integration with access token
    const { Client } = require('pg')
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    })

    await client.connect()
    
    const result = await client.query(`
      SELECT id, credentials 
      FROM integrations 
      WHERE type = 'SHOPIFY' 
      AND status = 'CONNECTED' 
      AND credentials->>'shop' = $1
    `, [shop])
    
    await client.end()

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No connected integration found'
      })
    }

    const credentials = result.rows[0].credentials
    const accessToken = credentials.accessToken

    console.log('🧹 Found integration with access token')

    // Get ALL existing webhooks (not just ours)
    const webhooks = await ShopifyService.listWebhooks(shop, accessToken)
    const allWebhooks = webhooks.webhooks || []
    
    console.log(`🧹 Found ${allWebhooks.length} total webhooks in Shopify`)

    const results = {
      deleted: [],
      errors: [],
      skipped: []
    }

    // Delete ALL webhooks to ensure clean slate
    for (const webhook of allWebhooks) {
      try {
        console.log(`🧹 Deleting webhook: ${webhook.topic} -> ${webhook.address}`)
        await ShopifyService.deleteWebhook(shop, accessToken, webhook.id)
        results.deleted.push({
          id: webhook.id,
          topic: webhook.topic,
          address: webhook.address
        })
        console.log(`✅ Deleted webhook: ${webhook.topic}`)
      } catch (deleteError) {
        results.errors.push(`Failed to delete ${webhook.topic} (${webhook.id}): ${deleteError.message}`)
        console.error(`❌ Failed to delete webhook ${webhook.id}:`, deleteError)
      }
    }

    console.log('🧹 All webhooks deleted, waiting 5 seconds before recreating...')
    await new Promise(resolve => setTimeout(resolve, 5000))

    // Now create new webhooks with correct endpoint and secret
    const baseUrl = process.env.NEXTAUTH_URL || 'https://taxflow-smoky.vercel.app'
    const correctEndpoint = `${baseUrl}/api/webhooks/shopify`
    
    const webhookTopics = [
      'orders/create',
      'orders/updated', 
      'orders/cancelled',
      'refunds/create',
      'app/uninstalled'
    ]

    const created = []
    const createErrors = []

    for (const topic of webhookTopics) {
      try {
        console.log(`🧹 Creating webhook: ${topic} -> ${correctEndpoint}`)
        const result = await ShopifyService.createWebhook(shop, accessToken, topic, correctEndpoint)
        created.push({
          topic,
          address: correctEndpoint,
          id: result.webhook.id
        })
        console.log(`✅ Created webhook: ${topic}`)
      } catch (createError) {
        createErrors.push(`Failed to create ${topic}: ${createError.message}`)
        console.error(`❌ Failed to create webhook for ${topic}:`, createError)
      }
    }

    return NextResponse.json({
      success: true,
      shop: shop,
      correctEndpoint: correctEndpoint,
      results: {
        totalWebhooksFound: allWebhooks.length,
        deleted: results.deleted,
        deleteErrors: results.errors,
        created: created,
        createErrors: createErrors
      },
      summary: `Force cleaned ${results.deleted.length} webhooks, created ${created.length} new ones`,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('🧹 Force cleanup error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}