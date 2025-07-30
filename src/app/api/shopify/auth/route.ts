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

    // Generate secure state parameter
    const state = crypto.randomBytes(32).toString('hex')
    
    // Store state and user info in session/database for verification
    // For now, we'll include user email in state (in production, use proper session storage)
    const stateData = {
      state,
      userEmail: session.user.email,
      shop: normalizedShop,
      timestamp: Date.now()
    }

    // Generate authorization URL
    const authUrl = ShopifyService.generateAuthUrl(normalizedShop, state)

    return NextResponse.json({
      success: true,
      authUrl,
      state: stateData // In production, store this server-side
    })

  } catch (error) {
    console.error('Shopify auth initiation error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate Shopify authorization' },
      { status: 500 }
    )
  }
}