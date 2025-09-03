import { NextRequest, NextResponse } from 'next/server'

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
 * Basic session token handling for embedded app authentication
 * TODO: Add full JWT validation when jsonwebtoken is installed
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
    
    // Basic validation - extract shop from URL parameters as fallback
    const shop = req.nextUrl.searchParams.get('shop')
    
    if (!shop) {
      return { valid: false, error: 'Missing shop parameter' }
    }

    // For now, accept any token with a shop parameter
    // TODO: Implement proper JWT validation
    if (token && shop) {
      return { valid: true, shop }
    }

    return { valid: false, error: 'Invalid session' }
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