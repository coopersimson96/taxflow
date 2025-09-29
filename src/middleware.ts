import { NextRequest, NextResponse } from 'next/server'

/**
 * Secure middleware for database session strategy
 * 
 * Since we use database sessions (not JWT), we can't check auth in middleware.
 * Instead, we handle authentication at the page/API level consistently.
 */

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  
  // For database sessions, we can't reliably check auth state in middleware
  // So we use a simpler approach: protect pages based on routes
  
  console.log(`[Middleware] Processing path: ${pathname}`)

  // List of public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/auth/signin',
    '/auth/error', 
    '/auth/signout',
    '/terms',
    '/privacy',
  ]
  
  // API routes that don't need middleware intervention
  const apiRoutes = [
    '/api/',
    '/_next/',
    '/images/'
  ]
  
  // Check if route is public or API
  const isPublicRoute = publicRoutes.includes(pathname) || pathname.includes('.')
  const isApiRoute = apiRoutes.some(route => pathname.startsWith(route))
  
  if (isPublicRoute || isApiRoute) {
    return NextResponse.next()
  }
  
  // For protected pages (dashboard, settings, etc.), we can't check auth in middleware
  // with database sessions. Let the page components handle authentication.
  // This prevents the redirect loop issue.
  console.log(`[Middleware] Protected route ${pathname} - letting page handle auth`)
  return NextResponse.next()
}

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