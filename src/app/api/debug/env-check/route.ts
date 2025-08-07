import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

    // Also check if we can access webhook info
    let webhookInfo = null
    try {
      const integration = await prisma.integration.findFirst({
        where: { type: 'SHOPIFY', status: 'CONNECTED' }
      })
      
      if (integration) {
        const credentials = integration.credentials as any
        webhookInfo = {
          shop: credentials?.shop,
          hasAccessToken: !!credentials?.accessToken,
          integrationId: integration.id
        }
      }
    } catch (dbError) {
      webhookInfo = { error: 'Cannot access integration data' }
    }

    return NextResponse.json({
      success: true,
      environmentStatus: envCheck,
      partialValues,
      webhookInfo,
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