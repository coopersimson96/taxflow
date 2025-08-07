import { NextRequest, NextResponse } from 'next/server'
import { ShopifyService } from '@/lib/services/shopify-service'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Hard-coded values for your test store since integration lookup isn't working
    const shop = 'taxflow-test'
    const shopifyApiKey = process.env.SHOPIFY_API_KEY
    const shopifyApiSecret = process.env.SHOPIFY_API_SECRET
    
    if (!shopifyApiKey || !shopifyApiSecret) {
      return NextResponse.json({
        success: false,
        error: 'Missing Shopify API credentials'
      })
    }

    console.log('Attempting direct webhook fix for shop:', shop)
    
    // We need the access token - let's try to find it from the database differently
    const { Client } = require('pg')
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    })

    await client.connect()
    
    // Get the integration directly with SQL
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
        error: 'No connected integration found for taxflow-test',
        suggestion: 'Try reconnecting your Shopify store'
      })
    }

    const credentials = result.rows[0].credentials
    const accessToken = credentials.accessToken

    if (!accessToken) {
      return NextResponse.json({
        success: false,
        error: 'No access token found in integration'
      })
    }

    console.log('Found integration with access token')

    // Now fix the webhooks
    const baseUrl = process.env.NEXTAUTH_URL || 'https://taxflow-smoky.vercel.app'
    const correctEndpoint = `${baseUrl}/api/webhooks/shopify`

    // Get existing webhooks
    const webhooks = await ShopifyService.listWebhooks(shop, accessToken)
    const existingWebhooks = webhooks.webhooks || []
    
    console.log(`Found ${existingWebhooks.length} existing webhooks`)

    const results = {
      deleted: [],
      created: [],
      errors: []
    }

    // Delete ALL existing webhooks to clean slate
    for (const webhook of existingWebhooks) {
      try {
        await ShopifyService.deleteWebhook(shop, accessToken, webhook.id)
        results.deleted.push({
          id: webhook.id,
          topic: webhook.topic,
          oldAddress: webhook.address
        })
        console.log(`✅ Deleted webhook: ${webhook.topic}`)
      } catch (deleteError) {
        results.errors.push(`Failed to delete ${webhook.topic}: ${deleteError.message}`)
        console.error(`❌ Failed to delete webhook ${webhook.id}:`, deleteError)
      }
    }

    // Create new webhooks with correct endpoint
    const webhookTopics = [
      'orders/create',
      'orders/updated', 
      'orders/cancelled',
      'refunds/create',
      'app/uninstalled'
    ]

    for (const topic of webhookTopics) {
      try {
        const result = await ShopifyService.createWebhook(shop, accessToken, topic, correctEndpoint)
        results.created.push({
          topic,
          address: correctEndpoint,
          id: result.webhook.id
        })
        console.log(`✅ Created webhook: ${topic} -> ${correctEndpoint}`)
      } catch (createError) {
        results.errors.push(`Failed to create ${topic}: ${createError.message}`)
        console.error(`❌ Failed to create webhook for ${topic}:`, createError)
      }
    }

    return NextResponse.json({
      success: true,
      shop: shop,
      correctEndpoint: correctEndpoint,
      results: results,
      summary: `Deleted ${results.deleted.length} old webhooks, created ${results.created.length} new ones`,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Direct webhook fix error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}