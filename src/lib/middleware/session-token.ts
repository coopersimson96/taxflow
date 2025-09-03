import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { SHOPIFY_CONFIG } from '@/lib/config/constants'

interface SessionTokenPayload {
  iss: string
  dest: string
  aud: string
  sub: string
  exp: number
  nbf: number
  iat: number
  jti: string
  sid: string
}

/**
 * Validates Shopify session tokens for embedded app authentication
 */
export async function validateSessionToken(
  req: NextRequest
): Promise<{ valid: boolean; shop?: string; error?: string }> {
  try {
    // Get session token from Authorization header
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return { valid: false, error: 'Missing or invalid authorization header' }
    }

    const token = authHeader.substring(7)
    
    // Verify token with Shopify API secret
    const decoded = jwt.verify(
      token,
      process.env.SHOPIFY_API_SECRET!,
      {
        algorithms: ['HS256'],
        clockTolerance: 5 // Allow 5 seconds clock skew
      }
    ) as SessionTokenPayload

    // Validate token claims
    const apiKey = process.env.SHOPIFY_API_KEY
    const expectedAudience = apiKey

    if (decoded.aud !== expectedAudience) {
      return { valid: false, error: 'Invalid token audience' }
    }

    // Extract shop domain from dest claim
    const destUrl = new URL(decoded.dest)
    const shop = destUrl.hostname

    // Additional validation
    const now = Math.floor(Date.now() / 1000)
    if (decoded.exp < now) {
      return { valid: false, error: 'Token expired' }
    }

    if (decoded.nbf > now) {
      return { valid: false, error: 'Token not yet valid' }
    }

    return { valid: true, shop }
  } catch (error) {
    console.error('Session token validation error:', error)
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : 'Invalid token' 
    }
  }
}

/**
 * Middleware to protect embedded app routes
 */
export function withSessionToken(
  handler: (req: NextRequest, context: { shop: string }) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    // Skip validation for non-embedded requests
    const isEmbedded = req.headers.get('x-shopify-embedded') === '1' ||
                      req.nextUrl.searchParams.get('embedded') === '1'

    if (!isEmbedded) {
      // For non-embedded, rely on NextAuth session
      return NextResponse.next()
    }

    // Validate session token for embedded requests
    const { valid, shop, error } = await validateSessionToken(req)

    if (!valid) {
      return NextResponse.json(
        { error: 'Unauthorized', message: error },
        { status: 401 }
      )
    }

    // Call the handler with shop context
    return handler(req, { shop: shop! })
  }
}

/**
 * Get session token from various sources
 */
export function getSessionToken(req: NextRequest): string | null {
  // Check Authorization header first
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  // Check query parameter (for some App Bridge versions)
  const token = req.nextUrl.searchParams.get('session')
  if (token) {
    return token
  }

  return null
}