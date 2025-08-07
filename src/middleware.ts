import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

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

    // Allow access to public pages and webhook endpoints
    if (
      pathname === '/' ||
      pathname.startsWith('/api/auth/') ||
      pathname.startsWith('/api/webhooks/') ||
      pathname.startsWith('/api/shopify/') ||
      pathname.startsWith('/terms') ||
      pathname.startsWith('/privacy') ||
      pathname.startsWith('/_next/') ||
      pathname.startsWith('/images/') ||
      pathname.includes('.')
    ) {
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

        // Always allow access to auth pages, public routes, and webhook endpoints
        if (
          pathname.startsWith('/auth/') ||
          pathname === '/' ||
          pathname.startsWith('/api/auth/') ||
          pathname.startsWith('/api/webhooks/') ||
          pathname.startsWith('/api/shopify/') ||
          pathname.startsWith('/terms') ||
          pathname.startsWith('/privacy') ||
          pathname.startsWith('/_next/') ||
          pathname.startsWith('/images/') ||
          pathname.includes('.')
        ) {
          return true
        }

        // For all other routes, require authentication
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