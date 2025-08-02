import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Simulate what Shopify would send to our callback
    const baseUrl = process.env.NEXTAUTH_URL || 'https://taxflow-smoky.vercel.app'
    const testParams = new URLSearchParams({
      code: 'test_code_12345',
      hmac: 'test_hmac_signature',
      shop: 'taxflow-test.myshopify.com',
      state: 'test_state_12345',
      timestamp: Math.floor(Date.now() / 1000).toString()
    })
    
    const callbackUrl = `${baseUrl}/api/shopify/callback?${testParams.toString()}`
    
    console.log('Simulating callback to:', callbackUrl)
    
    return NextResponse.json({
      success: true,
      message: 'Callback simulation test',
      generatedCallbackUrl: callbackUrl,
      instructions: [
        '1. Copy the generatedCallbackUrl above',
        '2. Paste it in a new browser tab to test the callback',
        '3. Check Vercel logs for callback processing',
        '4. This simulates what Shopify should be sending'
      ],
      note: 'This will likely fail HMAC verification (expected), but should show callback processing'
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}