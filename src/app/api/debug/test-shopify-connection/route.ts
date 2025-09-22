import { NextResponse } from 'next/server'

export async function GET() {
  const testShop = 'setasidetest.myshopify.com'
  
  try {
    // Test 1: Can we reach Shopify at all?
    console.log('Testing connection to Shopify...')
    const response = await fetch(`https://${testShop}/admin/api/2024-01/shop.json`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    
    console.log('Response status:', response.status)
    const text = await response.text()
    console.log('Response text:', text.substring(0, 200))
    
    // Test 2: Can we reach the OAuth endpoint?
    console.log('Testing OAuth endpoint...')
    const oauthResponse = await fetch(`https://${testShop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ test: true })
    })
    
    console.log('OAuth response status:', oauthResponse.status)
    const oauthText = await oauthResponse.text()
    console.log('OAuth response:', oauthText.substring(0, 200))
    
    return NextResponse.json({
      success: true,
      shopifyReachable: response.status !== 0,
      shopifyStatus: response.status,
      oauthStatus: oauthResponse.status,
      message: 'Connection test complete - check logs for details'
    })
    
  } catch (error) {
    console.error('Connection test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorType: error instanceof Error ? error.constructor.name : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined
    })
  }
}