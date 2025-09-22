import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { shop, code } = await request.json()
    
    if (!shop || !code) {
      return NextResponse.json({ error: 'Missing shop or code' }, { status: 400 })
    }
    
    const shopifyApiKey = process.env.SHOPIFY_API_KEY
    const shopifyApiSecret = process.env.SHOPIFY_API_SECRET
    const redirectUri = `https://taxflow-smoky.vercel.app/api/shopify/callback`
    
    const tokenUrl = `https://${shop}.myshopify.com/admin/oauth/access_token`
    const requestBody = {
      client_id: shopifyApiKey,
      client_secret: shopifyApiSecret,
      code,
      redirect_uri: redirectUri,
    }
    
    console.log('Debug OAuth test:', {
      tokenUrl,
      requestBody: {
        ...requestBody,
        client_secret: requestBody.client_secret ? '***' + requestBody.client_secret.slice(-4) : 'NOT SET',
        code: code.slice(0, 10) + '...'
      }
    })
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })
    
    const responseText = await response.text()
    console.log('OAuth response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseText
    })
    
    let responseData
    try {
      responseData = JSON.parse(responseText)
    } catch (e) {
      responseData = { raw: responseText }
    }
    
    return NextResponse.json({
      status: response.status,
      statusText: response.statusText,
      response: responseData,
      debug: {
        shopUsed: shop,
        redirectUriUsed: redirectUri,
        hasApiKey: !!shopifyApiKey,
        hasApiSecret: !!shopifyApiSecret,
        codeLength: code.length
      }
    })
    
  } catch (error) {
    console.error('OAuth test error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}