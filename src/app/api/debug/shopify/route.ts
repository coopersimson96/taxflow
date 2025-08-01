import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Check environment variables (without exposing secrets)
    const envCheck = {
      SHOPIFY_API_KEY: !!process.env.SHOPIFY_API_KEY,
      SHOPIFY_API_SECRET: !!process.env.SHOPIFY_API_SECRET,
      SHOPIFY_SCOPES: process.env.SHOPIFY_SCOPES,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      SHOPIFY_API_KEY_LENGTH: process.env.SHOPIFY_API_KEY?.length || 0,
      SHOPIFY_API_SECRET_LENGTH: process.env.SHOPIFY_API_SECRET?.length || 0,
    }

    // Check the redirect URI that will be used
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/shopify/callback`

    return NextResponse.json({
      success: true,
      environment: envCheck,
      redirectUri,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}