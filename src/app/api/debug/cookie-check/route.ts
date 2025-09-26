import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const allCookies = cookieStore.getAll()
    
    // Check for various NextAuth cookie patterns
    const nextAuthCookies = allCookies.filter(cookie => 
      cookie.name.includes('next-auth') || 
      cookie.name.includes('session-token') ||
      cookie.name.includes('__Host-') ||
      cookie.name.includes('__Secure-')
    )
    
    // Also check what NextAuth expects
    const expectedCookieName = process.env.NODE_ENV === 'production' 
      ? '__Secure-next-auth.session-token'
      : 'next-auth.session-token'
    
    const sessionCookie = cookieStore.get(expectedCookieName)
    
    return NextResponse.json({
      success: true,
      environment: process.env.NODE_ENV,
      vercel: !!process.env.VERCEL,
      nextAuthUrl: process.env.NEXTAUTH_URL,
      expectedCookieName,
      sessionCookieFound: !!sessionCookie,
      sessionCookieValue: sessionCookie ? 'REDACTED' : null,
      allNextAuthCookies: nextAuthCookies.map(c => ({
        name: c.name,
        hasValue: !!c.value,
        httpOnly: c.httpOnly,
        secure: c.secure,
        sameSite: c.sameSite
      })),
      totalCookies: allCookies.length,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}