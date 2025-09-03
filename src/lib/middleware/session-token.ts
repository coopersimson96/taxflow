import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

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
 * Implements proper JWT validation with security best practices
 */
export async function validateSessionToken(
  req: NextRequest
): Promise<{ valid: boolean; shop?: string; error?: string }> {
  try {
    // Verify required environment variables
    const apiSecret = process.env.SHOPIFY_API_SECRET
    const apiKey = process.env.SHOPIFY_API_KEY

    if (!apiSecret || !apiKey) {
      console.error('Missing SHOPIFY_API_SECRET or SHOPIFY_API_KEY')
      return { valid: false, error: 'Server configuration error' }
    }

    // Get session token from Authorization header
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return { valid: false, error: 'Missing or invalid authorization header' }
    }

    const token = authHeader.substring(7)
    
    if (!token || token.length < 10) {
      return { valid: false, error: 'Invalid token format' }
    }

    // Verify JWT with Shopify API secret
    const decoded = jwt.verify(
      token,
      apiSecret,
      {
        algorithms: ['HS256'],
        clockTolerance: 5, // Allow 5 seconds clock skew
        issuer: undefined, // Shopify can have various issuers
        audience: apiKey
      }
    ) as SessionTokenPayload

    // Extract and validate shop domain from dest claim
    let shop: string
    try {
      const destUrl = new URL(decoded.dest)
      shop = destUrl.hostname
      
      // Validate shop domain format
      if (!shop.endsWith('.myshopify.com') && !shop.endsWith('.shopify.com')) {
        return { valid: false, error: 'Invalid shop domain' }
      }
    } catch {
      return { valid: false, error: 'Invalid dest URL in token' }
    }

    // Additional security validations
    const now = Math.floor(Date.now() / 1000)
    
    if (decoded.exp < now) {
      return { valid: false, error: 'Token expired' }
    }

    if (decoded.nbf > now) {
      return { valid: false, error: 'Token not yet valid' }
    }

    // Validate token age (additional security)
    const tokenAge = now - decoded.iat
    const maxAge = 60 * 60 // 1 hour max
    if (tokenAge > maxAge) {
      return { valid: false, error: 'Token too old' }
    }

    return { valid: true, shop }
  } catch (error) {
    // Log security events for monitoring
    console.error('Session token validation failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userAgent: req.headers.get('user-agent'),
      ip: req.headers.get('x-forwarded-for') || 'unknown',
      timestamp: new Date().toISOString()
    })
    
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : 'Token validation failed' 
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