import { NextRequest, NextResponse } from 'next/server'

/**
 * Rate Limiting Implementation for API Security
 *
 * Uses in-memory storage for rate limits with sliding window algorithm
 * For production at scale, consider Redis-based implementation
 *
 * Security requirements:
 * - Prevent brute force attacks
 * - Prevent API abuse
 * - Comply with Shopify App Store security standards
 */

export interface RateLimitConfig {
  windowMs: number      // Time window in milliseconds
  maxRequests: number   // Maximum requests per window
  message?: string      // Custom error message
  skipSuccessfulRequests?: boolean  // Don't count successful requests
}

interface RateLimitEntry {
  count: number
  resetTime: number
  firstRequest: number
}

// In-memory store for rate limiting
// Key format: "identifier:endpoint"
const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  const entries = Array.from(rateLimitStore.entries())
  for (const [key, entry] of entries) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

/**
 * Default rate limit configurations for different endpoint types
 */
export const RateLimitPresets = {
  // Strict limit for authentication endpoints (prevent brute force)
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    message: 'Too many authentication attempts. Please try again later.'
  },

  // Standard limit for general API endpoints
  API: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60,
    message: 'Too many requests. Please try again later.'
  },

  // Lenient limit for read operations
  READ: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 120,
    message: 'Too many requests. Please try again later.'
  },

  // Strict limit for write operations
  WRITE: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
    message: 'Too many write requests. Please try again later.'
  },

  // Very strict for billing operations
  BILLING: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    message: 'Too many billing requests. Please try again later.'
  },

  // Webhook endpoints (per shop)
  WEBHOOK: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    message: 'Too many webhook requests. Please try again later.'
  }
}

/**
 * Get identifier for rate limiting from request
 * Priority: session user > IP address > shop parameter
 */
function getRateLimitIdentifier(request: NextRequest, session?: { user?: { email?: string | null } }): string {
  // Priority 1: Authenticated user email
  if (session?.user?.email) {
    return `user:${session.user.email}`
  }

  // Priority 2: Shop parameter (for shop-specific endpoints)
  const shop = request.nextUrl.searchParams.get('shop')
  if (shop) {
    return `shop:${shop}`
  }

  // Priority 3: IP address
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() :
             request.headers.get('x-real-ip') ||
             'unknown'

  return `ip:${ip}`
}

/**
 * Check if request should be rate limited
 */
function checkRateLimit(
  identifier: string,
  endpoint: string,
  config: RateLimitConfig
): { limited: boolean; remaining: number; resetTime: number } {
  const key = `${identifier}:${endpoint}`
  const now = Date.now()

  // Get or create rate limit entry
  let entry = rateLimitStore.get(key)

  if (!entry || entry.resetTime < now) {
    // Create new entry (window expired or doesn't exist)
    entry = {
      count: 1,
      resetTime: now + config.windowMs,
      firstRequest: now
    }
    rateLimitStore.set(key, entry)

    return {
      limited: false,
      remaining: config.maxRequests - 1,
      resetTime: entry.resetTime
    }
  }

  // Increment count
  entry.count++

  // Check if limit exceeded
  if (entry.count > config.maxRequests) {
    return {
      limited: true,
      remaining: 0,
      resetTime: entry.resetTime
    }
  }

  return {
    limited: false,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime
  }
}

/**
 * Apply rate limiting to request
 * Returns null if request is allowed, or NextResponse with 429 if rate limited
 */
export function rateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  session?: { user?: { email?: string | null } }
): NextResponse | null {
  const identifier = getRateLimitIdentifier(request, session)
  const endpoint = request.nextUrl.pathname

  const result = checkRateLimit(identifier, endpoint, config)

  // Add rate limit headers to response
  const headers = {
    'X-RateLimit-Limit': config.maxRequests.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
    'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString()
  }

  if (result.limited) {
    return NextResponse.json(
      {
        error: config.message || 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
      },
      {
        status: 429,
        headers
      }
    )
  }

  return null
}

/**
 * Middleware wrapper for rate limiting
 * Use this in API route handlers
 */
export function withRateLimit(
  config: RateLimitConfig
) {
  return async (
    request: NextRequest,
    handler: (request: NextRequest) => Promise<NextResponse>,
    session?: { user?: { email?: string | null } }
  ): Promise<NextResponse> => {
    // Check rate limit
    const rateLimitResponse = rateLimit(request, config, session)

    if (rateLimitResponse) {
      return rateLimitResponse
    }

    // Execute handler
    return handler(request)
  }
}

/**
 * Decrement rate limit count (for failed requests that shouldn't count)
 */
export function decrementRateLimit(
  request: NextRequest,
  session?: { user?: { email?: string | null } }
): void {
  const identifier = getRateLimitIdentifier(request, session)
  const endpoint = request.nextUrl.pathname
  const key = `${identifier}:${endpoint}`

  const entry = rateLimitStore.get(key)
  if (entry && entry.count > 0) {
    entry.count--
  }
}

/**
 * Clear rate limit for an identifier (use with caution)
 */
export function clearRateLimit(
  identifier: string,
  endpoint?: string
): void {
  if (endpoint) {
    rateLimitStore.delete(`${identifier}:${endpoint}`)
  } else {
    // Clear all entries for identifier
    const keys = Array.from(rateLimitStore.keys())
    for (const key of keys) {
      if (key.startsWith(`${identifier}:`)) {
        rateLimitStore.delete(key)
      }
    }
  }
}

/**
 * Get current rate limit status for debugging
 */
export function getRateLimitStatus(
  identifier: string,
  endpoint: string
): RateLimitEntry | null {
  const key = `${identifier}:${endpoint}`
  return rateLimitStore.get(key) || null
}
