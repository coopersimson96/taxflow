import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [session-consistency] Testing session access...')
    
    // Test 1: getServerSession (what our API uses)
    const session1 = await getServerSession(authOptions)
    console.log('Test 1 - getServerSession result:', {
      sessionExists: !!session1,
      userExists: !!session1?.user,
      email: session1?.user?.email,
      userId: session1?.user?.id
    })
    
    // Test 2: Alternative approach - just test with different timing
    await new Promise(resolve => setTimeout(resolve, 100)) // Small delay
    const session2 = await getServerSession(authOptions)
    console.log('Test 2 - getServerSession after delay:', {
      sessionExists: !!session2,
      userExists: !!session2?.user,
      email: session2?.user?.email,
      userId: session2?.user?.id
    })
    
    // Test 3: Check cookies directly
    const cookies = request.headers.get('cookie') || ''
    const hasSessionCookie = cookies.includes('next-auth.session-token') || cookies.includes('__Secure-next-auth.session-token')
    console.log('Test 3 - Cookie check:', {
      hasCookies: !!cookies,
      hasSessionCookie,
      cookieCount: cookies.split(';').length
    })
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      test1_getServerSession: {
        sessionExists: !!session1,
        email: session1?.user?.email
      },
      test2_getServerSessionAfterDelay: {
        sessionExists: !!session2,
        email: session2?.user?.email
      },
      test3_cookies: {
        hasCookies: !!cookies,
        hasSessionCookie
      },
      recommendation: !session1 && !session2 ? 
        'Session not found - likely timing issue or cookie problem' :
        'Session found - API should work'
    })
    
  } catch (error) {
    console.error('Session consistency test error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}