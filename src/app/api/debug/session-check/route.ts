import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Get the session token from the URL parameter for testing
    const sessionToken = request.nextUrl.searchParams.get('token') || '87016610-62d2-4282-9af0-0d8320c49ab9'
    
    // Check if the session exists in the database
    const session = await prisma.session.findUnique({
      where: { sessionToken },
      include: {
        user: true
      }
    })
    
    // Get all sessions to understand the pattern
    const allSessions = await prisma.session.findMany({
      orderBy: { expires: 'desc' },
      take: 5,
      select: {
        id: true,
        sessionToken: true,
        userId: true,
        expires: true,
        createdAt: true,
        updatedAt: true
      }
    })
    
    // Check for expired sessions
    const now = new Date()
    const activeSessions = allSessions.filter(s => s.expires > now)
    const expiredSessions = allSessions.filter(s => s.expires <= now)
    
    return NextResponse.json({
      success: true,
      searchedToken: sessionToken,
      sessionFound: !!session,
      sessionDetails: session ? {
        id: session.id,
        userId: session.userId,
        expires: session.expires,
        isExpired: session.expires <= now,
        user: session.user ? {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name
        } : null
      } : null,
      sessionStats: {
        totalSessions: allSessions.length,
        activeSessions: activeSessions.length,
        expiredSessions: expiredSessions.length
      },
      recentSessions: allSessions.map(s => ({
        id: s.id,
        tokenPreview: `${s.sessionToken.substring(0, 8)}...`,
        userId: s.userId,
        expires: s.expires,
        isExpired: s.expires <= now,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt
      })),
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Session check error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}