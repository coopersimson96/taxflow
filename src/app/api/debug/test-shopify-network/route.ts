import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const testResults = {
    timestamp: new Date().toISOString(),
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      isVercel: !!process.env.VERCEL,
      vercelRegion: process.env.VERCEL_REGION || 'unknown',
      nodeEnv: process.env.NODE_ENV,
      nextAuthUrl: process.env.NEXTAUTH_URL,
      hasShopifyCredentials: {
        apiKey: !!process.env.SHOPIFY_API_KEY,
        apiSecret: !!process.env.SHOPIFY_API_SECRET,
      }
    },
    tests: [] as any[]
  }

  // Test 1: Basic HTTPS connectivity to Shopify
  try {
    console.log('Test 1: Testing basic HTTPS to Shopify...')
    const startTime = Date.now()
    const response = await fetch('https://myshopify.com', {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    })
    const duration = Date.now() - startTime
    
    testResults.tests.push({
      test: 'Basic HTTPS to myshopify.com',
      success: true,
      status: response.status,
      duration: `${duration}ms`,
      headers: Object.fromEntries(response.headers.entries())
    })
  } catch (error: any) {
    testResults.tests.push({
      test: 'Basic HTTPS to myshopify.com',
      success: false,
      error: error.message,
      errorType: error.name,
      errorCause: error.cause
    })
  }

  // Test 2: DNS resolution for specific shop
  const testShop = 'setasidetest.myshopify.com'
  try {
    console.log('Test 2: Testing DNS resolution for', testShop)
    const startTime = Date.now()
    const response = await fetch(`https://${testShop}`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    })
    const duration = Date.now() - startTime
    
    testResults.tests.push({
      test: `DNS resolution for ${testShop}`,
      success: true,
      status: response.status,
      duration: `${duration}ms`
    })
  } catch (error: any) {
    testResults.tests.push({
      test: `DNS resolution for ${testShop}`,
      success: false,
      error: error.message,
      errorType: error.name
    })
  }

  // Test 3: POST to token endpoint (without actual auth)
  try {
    console.log('Test 3: Testing POST capability to token endpoint...')
    const startTime = Date.now()
    const response = await fetch(`https://${testShop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        test: true,
        timestamp: new Date().toISOString()
      }),
      signal: AbortSignal.timeout(5000)
    })
    const duration = Date.now() - startTime
    
    testResults.tests.push({
      test: 'POST to token endpoint',
      success: true,
      status: response.status,
      statusText: response.statusText,
      duration: `${duration}ms`,
      note: 'Expected to fail with 400/401 - testing network connectivity only'
    })
  } catch (error: any) {
    testResults.tests.push({
      test: 'POST to token endpoint',
      success: false,
      error: error.message,
      errorType: error.name,
      errorStack: error.stack
    })
  }

  // Test 4: Check for proxy or firewall issues
  try {
    console.log('Test 4: Checking for proxy/firewall issues...')
    const startTime = Date.now()
    const response = await fetch('https://api.ipify.org?format=json', {
      signal: AbortSignal.timeout(5000)
    })
    const data = await response.json()
    const duration = Date.now() - startTime
    
    testResults.tests.push({
      test: 'Outbound IP check',
      success: true,
      outboundIP: data.ip,
      duration: `${duration}ms`,
      note: 'This is the IP that Shopify will see from your Vercel deployment'
    })
  } catch (error: any) {
    testResults.tests.push({
      test: 'Outbound IP check',
      success: false,
      error: error.message
    })
  }

  // Test 5: Test with different fetch options
  try {
    console.log('Test 5: Testing fetch with Node.js compatibility mode...')
    const { fetch: nodeFetch } = await import('node-fetch') as any
    const startTime = Date.now()
    
    // Use native fetch first
    const response = await fetch(`https://${testShop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'TaxFlow-Shopify-App/1.0'
      },
      body: JSON.stringify({ test: true }),
      // @ts-ignore - Next.js specific option
      cache: 'no-store',
      signal: AbortSignal.timeout(10000)
    })
    const duration = Date.now() - startTime
    
    testResults.tests.push({
      test: 'Fetch with extended options',
      success: true,
      status: response.status,
      duration: `${duration}ms`,
      fetchImplementation: 'native'
    })
  } catch (error: any) {
    testResults.tests.push({
      test: 'Fetch with extended options',
      success: false,
      error: error.message,
      errorType: error.name,
      suggestion: 'Consider using a custom fetch implementation or axios'
    })
  }

  // Summary
  const failedTests = testResults.tests.filter(t => !t.success)
  testResults.summary = {
    totalTests: testResults.tests.length,
    passed: testResults.tests.filter(t => t.success).length,
    failed: failedTests.length,
    likelyIssues: []
  }

  if (failedTests.length > 0) {
    if (failedTests.some(t => t.error?.includes('fetch failed'))) {
      testResults.summary.likelyIssues.push('Network connectivity issue in Vercel environment')
    }
    if (failedTests.some(t => t.error?.includes('ENOTFOUND'))) {
      testResults.summary.likelyIssues.push('DNS resolution failure')
    }
    if (failedTests.some(t => t.error?.includes('timeout'))) {
      testResults.summary.likelyIssues.push('Network timeout - possible firewall or routing issue')
    }
  }

  return NextResponse.json(testResults, { 
    status: failedTests.length > 0 ? 500 : 200 
  })
}