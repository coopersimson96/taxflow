import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

// Test the exact same setup as the auth adapter
const testPrisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})

export async function GET(request: NextRequest) {
  try {
    const sessionToken = '87016610-62d2-4282-9af0-0d8320c49ab9'
    
    console.log('Testing adapter getSessionAndUser logic...')
    
    // This mimics what PrismaAdapter.getSessionAndUser does
    const session = await testPrisma.session.findUnique({
      where: { sessionToken },
      include: { user: true }
    })
    
    console.log('Direct query result:', session)
    
    if (!session) {
      return NextResponse.json({
        success: false,
        message: 'Session not found with direct query',
        sessionToken,
        timestamp: new Date().toISOString()
      })
    }
    
    if (session.expires <= new Date()) {
      return NextResponse.json({
        success: false,
        message: 'Session expired',
        sessionToken,
        expires: session.expires,
        now: new Date(),
        timestamp: new Date().toISOString()
      })
    }
    
    // Test the exact return format that the adapter expects
    const result = {
      session: {
        sessionToken: session.sessionToken,
        userId: session.userId,
        expires: session.expires
      },
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.avatar,
        emailVerified: session.user.emailVerified
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Adapter logic successful',
      sessionToken,
      result,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Adapter test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}