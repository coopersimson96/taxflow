import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only show sensitive info to admin users
  const isAdmin = session.user.email === 'cooper@shopmogano.com'
  
  const config = {
    environment: process.env.NODE_ENV,
    nextAuthUrl: process.env.NEXTAUTH_URL || 'NOT SET',
    vercelUrl: process.env.VERCEL_URL || 'NOT SET',
    hasApiKey: !!process.env.SHOPIFY_API_KEY,
    hasApiSecret: !!process.env.SHOPIFY_API_SECRET,
    scopes: process.env.SHOPIFY_SCOPES || 'NOT SET',
    webhookSecret: !!process.env.SHOPIFY_WEBHOOK_SECRET,
    
    // Computed values
    computedRedirectUri: `${process.env.NEXTAUTH_URL || process.env.VERCEL_URL}/api/shopify/callback`,
    
    // Debug info (only for admin)
    ...(isAdmin && {
      apiKeyPrefix: process.env.SHOPIFY_API_KEY?.substring(0, 8) + '...',
      apiSecretLength: process.env.SHOPIFY_API_SECRET?.length || 0,
      detailedUrls: {
        nextAuthUrl: process.env.NEXTAUTH_URL,
        vercelUrl: process.env.VERCEL_URL,
        vercelEnv: process.env.VERCEL_ENV,
        expectedCallback: `${process.env.NEXTAUTH_URL || process.env.VERCEL_URL}/api/shopify/callback`
      }
    })
  }

  return NextResponse.json(config)
}