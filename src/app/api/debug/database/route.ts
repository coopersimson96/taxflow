import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    console.log('Testing database connection...')
    
    // Test basic connection
    const result = await prisma.$queryRaw`SELECT 1 as test`
    console.log('Basic connection test passed')
    
    // Try to check if Organization table exists by attempting a simple query
    let organizationExists = false
    let integrationExists = false
    let userExists = false
    
    try {
      await prisma.organization.findFirst({ take: 1 })
      organizationExists = true
    } catch (e) {
      console.log('Organization table not accessible:', e instanceof Error ? e.message : 'Unknown error')
    }
    
    try {
      await prisma.integration.findFirst({ take: 1 })
      integrationExists = true
    } catch (e) {
      console.log('Integration table not accessible:', e instanceof Error ? e.message : 'Unknown error')
    }
    
    try {
      await prisma.user.findFirst({ take: 1 })
      userExists = true
    } catch (e) {
      console.log('User table not accessible:', e instanceof Error ? e.message : 'Unknown error')
    }

    return NextResponse.json({
      success: true,
      connection: 'OK',
      testQuery: result,
      tables: {
        organization: organizationExists,
        integration: integrationExists,
        user: userExists
      },
      needsMigration: !organizationExists || !integrationExists || !userExists,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Database connection error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}