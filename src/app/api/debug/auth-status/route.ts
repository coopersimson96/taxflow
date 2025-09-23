import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Check user count
    const userCount = await prisma.user.count()
    
    // Check account count
    const accountCount = await prisma.account.count()
    
    // Check session count
    const sessionCount = await prisma.session.count()
    
    // Get latest users
    const latestUsers = await prisma.user.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' },
      include: {
        accounts: true,
        sessions: true,
      }
    })
    
    // Get latest accounts
    const latestAccounts = await prisma.account.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' },
    })
    
    // Get latest sessions
    const latestSessions = await prisma.session.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      counts: {
        users: userCount,
        accounts: accountCount,
        sessions: sessionCount
      },
      latestUsers,
      latestAccounts,
      latestSessions,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Auth status check error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}