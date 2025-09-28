import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

/**
 * Secure middleware with explicit route definitions
 * 
 * Security layers:
 * 1. Public routes - No authentication required
 * 2. Public API routes - Secured by external mechanisms (HMAC, OAuth state)
 * 3. Protected API routes - Authentication required at middleware + authorization at API level
 * 4. Protected pages - Full authentication + authorization at middleware level
 */

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    // Allow access to auth pages without authentication
    if (pathname.startsWith('/auth/')) {
      // Redirect authenticated users away from auth pages
      if (token) {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
      return NextResponse.next()
    }

    // Define public routes that don't require authentication
    const publicRoutes = [
      '/',
      '/terms',
      '/privacy',
    ]
    
    // Define API routes that should bypass middleware auth (they handle auth internally)
    const publicApiRoutes = [
      '/api/auth/',      // NextAuth routes
      '/api/webhooks/',  // Shopify webhooks (secured by HMAC)
      '/api/shopify/',   // Shopify OAuth (secured by state/HMAC)
    ]
    
    // Define API routes that require authentication but are handled at API level
    const protectedApiRoutes = [
      '/api/user/stores',         // User's connected stores
      '/api/user/current-integration', // Current integration data
      '/api/user/find-orphaned-stores', // Find orphaned stores
      '/api/user/link-store',     // Link user to store
      '/api/analytics/',          // Tax analytics data
      '/api/integrations/',       // Integration management
      '/api/admin/',              // Admin functions
      '/api/debug/',              // Debug endpoints
    ]
    
    // Allow public routes
    if (publicRoutes.includes(pathname) || 
        pathname.startsWith('/_next/') || 
        pathname.startsWith('/images/') || 
        pathname.includes('.')) {
      return NextResponse.next()
    }
    
    // Allow public API routes (no auth required)
    if (publicApiRoutes.some(route => pathname.startsWith(route))) {
      return NextResponse.next()
    }
    
    // For protected API routes, ensure user is authenticated but let API handle authorization
    if (protectedApiRoutes.some(route => pathname.startsWith(route))) {
      if (!token) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }
      return NextResponse.next()
    }

    // Check if user has access to the requested resource
    if (token) {
      // For organization-specific routes, check organization membership
      const orgSlugMatch = pathname.match(/^\/org\/([^\/]+)/)
      if (orgSlugMatch) {
        const requestedOrgSlug = orgSlugMatch[1]
        const userOrganizations = (token as any).organizations || []
        
        const hasAccess = userOrganizations.some(
          (org: any) => org.slug === requestedOrgSlug
        )
        
        if (!hasAccess) {
          // Redirect to dashboard if user doesn't have access to this organization
          return NextResponse.redirect(new URL('/dashboard', req.url))
        }
      }

      return NextResponse.next()
    }

    // Redirect unauthenticated users to sign in
    const signInUrl = new URL('/auth/signin', req.url)
    signInUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(signInUrl)
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl

        // Define routes that don't require authentication at all
        const publicPaths = [
          '/auth/',
          '/',
          '/api/auth/',
          '/api/webhooks/',
          '/api/shopify/',
          '/terms',
          '/privacy',
          '/_next/',
          '/images/'
        ]
        
        // Always allow access to public routes
        if (
          publicPaths.some(path => pathname.startsWith(path)) ||
          pathname.includes('.')
        ) {
          return true
        }
        
        // For protected routes, require authentication
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth.js routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$|.*\\.ico$).*)',
  ],
}