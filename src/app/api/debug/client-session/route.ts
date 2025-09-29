import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedSession } from '@/lib/session-utils'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [client-session] Checking server-side session for client debugging...')
    
    const session = await getUnifiedSession()
    
    const result = {
      timestamp: new Date().toISOString(),
      serverSideSession: {
        exists: !!session,
        email: session?.user?.email,
        userId: session?.user?.id,
        organizationCount: session?.user?.organizations?.length || 0
      },
      cookies: {
        raw: request.headers.get('cookie') || 'No cookies',
        hasSessionToken: (request.headers.get('cookie') || '').includes('next-auth.session-token') || 
                        (request.headers.get('cookie') || '').includes('__Secure-next-auth.session-token')
      },
      headers: {
        userAgent: request.headers.get('user-agent')?.substring(0, 100) + '...',
        referer: request.headers.get('referer')
      }
    }
    
    console.log('Server-side session check result:', result)
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('Client session debug error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}