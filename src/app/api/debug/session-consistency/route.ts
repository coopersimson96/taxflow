import { NextRequest, NextResponse } from 'next/server'
import { debugSessionAccess, getUnifiedSession } from '@/lib/session-utils'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [session-consistency] Testing unified session access...')
    
    // Test 1: Unified session access
    const debugResult = await debugSessionAccess()
    console.log('Test 1 - Unified session access:', debugResult)
    
    // Test 2: Direct session check
    const session = await getUnifiedSession()
    console.log('Test 2 - Direct session check:', {
      sessionExists: !!session,
      email: session?.user?.email,
      organizationCount: session?.user?.organizations?.length || 0
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
      unifiedSessionDebug: debugResult,
      directSessionCheck: {
        sessionExists: !!session,
        email: session?.user?.email,
        organizationCount: session?.user?.organizations?.length || 0
      },
      cookieCheck: {
        hasCookies: !!cookies,
        hasSessionCookie
      },
      recommendation: session ? 
        'Session found with unified management - should work consistently' :
        'Session not found - investigating cookie or timing issue'
    })
    
  } catch (error) {
    console.error('Session consistency test error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}