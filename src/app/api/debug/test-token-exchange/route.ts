import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Alternative fetch implementation for Vercel environment
async function vercelSafeFetch(url: string, options: RequestInit): Promise<Response> {
  // Try with undici first if available (Node 18+)
  if (global.fetch && typeof global.fetch === 'function') {
    try {
      console.log('Using global fetch for:', url)
      return await global.fetch(url, options)
    } catch (error) {
      console.error('Global fetch failed:', error)
      throw error
    }
  }
  
  // Fallback to standard fetch
  return fetch(url, options)
}

export async function POST(request: NextRequest) {
  try {
    const { shop, code } = await request.json()
    
    if (!shop || !code) {
      return NextResponse.json({
        error: 'Missing shop or code parameter'
      }, { status: 400 })
    }

    const shopifyApiKey = process.env.SHOPIFY_API_KEY
    const shopifyApiSecret = process.env.SHOPIFY_API_SECRET
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'https://taxflow-smoky.vercel.app'
    const redirectUri = `${baseUrl}/api/shopify/callback`

    if (!shopifyApiKey || !shopifyApiSecret) {
      return NextResponse.json({
        error: 'Shopify API credentials not configured'
      }, { status: 500 })
    }

    // Ensure shop has .myshopify.com suffix
    const shopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`
    const tokenUrl = `https://${shopDomain}/admin/oauth/access_token`

    const results = {
      timestamp: new Date().toISOString(),
      shop: shopDomain,
      tokenUrl,
      redirectUri,
      tests: [] as any[],
      environment: {
        isVercel: !!process.env.VERCEL,
        vercelRegion: process.env.VERCEL_REGION,
        nodeVersion: process.version,
        platform: process.platform
      }
    }

    // Test 1: Standard fetch with minimal options
    try {
      console.log('Test 1: Standard fetch...')
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: shopifyApiKey,
          client_secret: shopifyApiSecret,
          code,
          redirect_uri: redirectUri
        })
      })

      const responseText = await response.text()
      let responseData
      try {
        responseData = JSON.parse(responseText)
      } catch {
        responseData = responseText
      }

      results.tests.push({
        test: 'Standard fetch',
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        data: responseData
      })
    } catch (error: any) {
      results.tests.push({
        test: 'Standard fetch',
        success: false,
        error: error.message,
        errorType: error.name,
        errorCode: error.code,
        errorCause: error.cause
      })
    }

    // Test 2: Fetch with explicit keepalive
    try {
      console.log('Test 2: Fetch with keepalive...')
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          client_id: shopifyApiKey,
          client_secret: shopifyApiSecret,
          code,
          redirect_uri: redirectUri
        }),
        // @ts-ignore
        keepalive: true
      })

      const responseText = await response.text()
      results.tests.push({
        test: 'Fetch with keepalive',
        success: response.ok,
        status: response.status,
        note: 'keepalive option may help with connection pooling'
      })
    } catch (error: any) {
      results.tests.push({
        test: 'Fetch with keepalive',
        success: false,
        error: error.message
      })
    }

    // Test 3: Using node-fetch explicitly
    try {
      console.log('Test 3: Using dynamic import for better compatibility...')
      
      // Use dynamic import to ensure we get the right fetch implementation
      const fetchImpl = vercelSafeFetch
      
      const response = await fetchImpl(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'TaxFlow-Shopify-App/1.0'
        },
        body: JSON.stringify({
          client_id: shopifyApiKey,
          client_secret: shopifyApiSecret,
          code,
          redirect_uri: redirectUri
        })
      })

      const responseText = await response.text()
      results.tests.push({
        test: 'Dynamic fetch implementation',
        success: response.ok,
        status: response.status
      })
    } catch (error: any) {
      results.tests.push({
        test: 'Dynamic fetch implementation',
        success: false,
        error: error.message,
        stack: error.stack
      })
    }

    // Test 4: Test with URL constructor
    try {
      console.log('Test 4: Using URL constructor approach...')
      const url = new URL(`/admin/oauth/access_token`, `https://${shopDomain}`)
      
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: shopifyApiKey,
          client_secret: shopifyApiSecret,
          code,
          redirect_uri: redirectUri
        })
      })

      results.tests.push({
        test: 'URL constructor approach',
        success: response.ok,
        status: response.status,
        url: url.toString()
      })
    } catch (error: any) {
      results.tests.push({
        test: 'URL constructor approach',
        success: false,
        error: error.message
      })
    }

    // Summary and recommendations
    const successfulTests = results.tests.filter(t => t.success)
    const failedTests = results.tests.filter(t => !t.success)

    results.summary = {
      totalTests: results.tests.length,
      successful: successfulTests.length,
      failed: failedTests.length,
      recommendation: ''
    }

    if (successfulTests.length > 0) {
      results.summary.recommendation = `Use the approach from test: ${successfulTests[0].test}`
    } else if (failedTests.every(t => t.error?.includes('fetch failed'))) {
      results.summary.recommendation = 'This appears to be a Vercel-specific network issue. Consider: 1) Using Edge Runtime, 2) Implementing a proxy endpoint, or 3) Using a different hosting provider'
    }

    return NextResponse.json(results)

  } catch (error) {
    console.error('Test route error:', error)
    return NextResponse.json({
      error: 'Test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}