import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Test the OAuth URL generation process
    const shopifyApiKey = process.env.SHOPIFY_API_KEY
    const nextAuthUrl = process.env.NEXTAUTH_URL
    const shopifyScopes = process.env.SHOPIFY_SCOPES
    
    const shop = 'taxflow-test'
    const state = 'test-state-123'
    const redirectUri = `${nextAuthUrl}/api/shopify/callback`
    
    const authUrl = `https://${shop}.myshopify.com/admin/oauth/authorize?` +
      `client_id=${shopifyApiKey}&` +
      `scope=${encodeURIComponent(shopifyScopes || 'read_orders,read_products')}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `state=${state}&` +
      `grant_options[]=per-user`

    return NextResponse.json({
      success: true,
      environment: {
        shopifyApiKey: !!shopifyApiKey,
        nextAuthUrl,
        shopifyScopes,
      },
      generatedUrl: authUrl,
      redirectUri,
      shopifyPartnerDashboardUrl: 'Check that this matches exactly in Shopify Partner Dashboard',
      testInstructions: [
        '1. Copy the generatedUrl above',
        '2. Paste it in a new browser tab',
        '3. Complete the OAuth flow',
        '4. See if it calls the callback endpoint',
        '5. Check Vercel logs for callback activity'
      ]
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}