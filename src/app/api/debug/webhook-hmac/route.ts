import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'HMAC Debug Endpoint - Use POST to test HMAC verification',
    instructions: 'Send a POST request with X-Shopify-Hmac-Sha256 header to test HMAC logic'
  })
}

export async function POST(request: NextRequest) {
  console.log('🔍 HMAC DEBUG ENDPOINT - Webhook received')
  console.log('====================================')
  
  try {
    // Get headers
    const hmacHeader = request.headers.get('x-shopify-hmac-sha256')
    const shop = request.headers.get('x-shopify-shop-domain') || 'debug-shop'
    const topic = request.headers.get('x-shopify-topic') || 'debug/test'
    
    console.log('Headers received:')
    console.log('- HMAC Header:', hmacHeader ? 'Present' : 'Missing')
    console.log('- Shop Domain:', shop)
    console.log('- Topic:', topic)
    
    // Get raw body
    const rawBody = await request.text()
    console.log('- Raw body length:', rawBody.length)
    console.log('- Raw body preview:', rawBody.substring(0, 200))
    
    // Check environment
    const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET
    console.log('\\nEnvironment check:')
    console.log('- Webhook secret configured:', !!webhookSecret)
    console.log('- Secret length:', webhookSecret?.length || 0)
    console.log('- Secret preview:', webhookSecret ? webhookSecret.substring(0, 10) + '...' : 'Not set')
    
    if (!webhookSecret) {
      return NextResponse.json({
        error: 'SHOPIFY_WEBHOOK_SECRET not configured',
        debug: {
          hasSecret: false,
          envVars: Object.keys(process.env).filter(key => key.includes('SHOPIFY'))
        }
      }, { status: 500 })
    }
    
    if (!hmacHeader) {
      return NextResponse.json({
        error: 'No HMAC header provided',
        debug: {
          headers: Object.fromEntries(request.headers.entries()),
          hasSecret: true,
          secretLength: webhookSecret.length
        }
      }, { status: 400 })
    }
    
    // Calculate HMAC
    const crypto = require('crypto')
    const calculatedHmac = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody, 'utf8')
      .digest('base64')
    
    console.log('\\nHMAC Calculation:')
    console.log('- Calculated HMAC:', calculatedHmac)
    console.log('- Received HMAC:', hmacHeader)
    console.log('- Match:', calculatedHmac === hmacHeader)
    console.log('- Calculated length:', calculatedHmac.length)
    console.log('- Received length:', hmacHeader.length)
    
    // Additional debugging
    console.log('\\nDetailed comparison:')
    console.log('- First 20 chars calc:', calculatedHmac.substring(0, 20))
    console.log('- First 20 chars recv:', hmacHeader.substring(0, 20))
    console.log('- Last 20 chars calc:', calculatedHmac.substring(-20))
    console.log('- Last 20 chars recv:', hmacHeader.substring(-20))
    
    return NextResponse.json({
      success: calculatedHmac === hmacHeader,
      debug: {
        hasSecret: true,
        secretLength: webhookSecret.length,
        secretPreview: webhookSecret.substring(0, 10) + '...',
        calculatedHmac: calculatedHmac.substring(0, 20) + '...',
        receivedHmac: hmacHeader.substring(0, 20) + '...',
        bodyLength: rawBody.length,
        bodyPreview: rawBody.substring(0, 100),
        match: calculatedHmac === hmacHeader,
        shop: shop,
        topic: topic
      }
    })
    
  } catch (error) {
    console.error('HMAC debug error:', error)
    return NextResponse.json({
      error: 'HMAC debug failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}