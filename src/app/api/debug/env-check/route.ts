import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const envCheck = {
      SHOPIFY_API_KEY: !!process.env.SHOPIFY_API_KEY ? 'SET' : 'MISSING',
      SHOPIFY_API_SECRET: !!process.env.SHOPIFY_API_SECRET ? 'SET' : 'MISSING',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'MISSING',
      DATABASE_URL: !!process.env.DATABASE_URL ? 'SET' : 'MISSING',
      SHOPIFY_SCOPES: process.env.SHOPIFY_SCOPES || 'USING_DEFAULT',
    }
    
    // Partial values for debugging (never expose full secrets)
    const partialValues = {
      SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY ? `${process.env.SHOPIFY_API_KEY.substring(0, 8)}...` : 'MISSING',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      SHOPIFY_SCOPES: process.env.SHOPIFY_SCOPES,
    }

    return NextResponse.json({
      success: true,
      environmentStatus: envCheck,
      partialValues,
      allRequiredSet: Object.values(envCheck).every(status => status !== 'MISSING'),
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}