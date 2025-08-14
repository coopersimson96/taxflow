import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ShopifyService } from '@/lib/services/shopify-service'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { shop } = body

    if (!shop) {
      return NextResponse.json(
        { error: 'Shop domain is required' },
        { status: 400 }
      )
    }

    // Normalize and validate shop domain
    const normalizedShop = ShopifyService.normalizeShopDomain(shop)
    if (!ShopifyService.validateShopDomain(normalizedShop)) {
      return NextResponse.json(
        { error: 'Invalid shop domain format' },
        { status: 400 }
      )
    }

    // Generate secure state parameter with user info
    const stateData = {
      userEmail: session.user.email,
      shop: normalizedShop,
      timestamp: Date.now(),
      nonce: crypto.randomBytes(16).toString('hex')
    }
    
    // Encode state data (in production, encrypt this)
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64')

    // Generate authorization URL
    console.log('Generating auth URL for shop:', normalizedShop)
    console.log('Environment check:', {
      hasApiKey: !!process.env.SHOPIFY_API_KEY,
      hasApiSecret: !!process.env.SHOPIFY_API_SECRET,
      scopes: process.env.SHOPIFY_SCOPES,
      nextAuthUrl: process.env.NEXTAUTH_URL
    })
    
    const authUrl = ShopifyService.generateAuthUrl(normalizedShop, state)
    console.log('Generated auth URL:', authUrl)

    return NextResponse.json({
      success: true,
      authUrl
    })

  } catch (error) {
    console.error('Shopify auth initiation error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate Shopify authorization' },
      { status: 500 }
    )
  }
}