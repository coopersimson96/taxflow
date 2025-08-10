import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

export async function GET() {
  const results = {
    timestamp: new Date().toISOString(),
    tests: [] as any[]
  }

  // Test 1: Environment Variable
  const dbUrl = process.env.DATABASE_URL
  results.tests.push({
    test: 'Environment Variable',
    status: !!dbUrl ? 'PASS' : 'FAIL',
    details: {
      set: !!dbUrl,
      length: dbUrl?.length || 0,
      hasUsername: dbUrl?.includes('postgres.zpx') || false,
      hasSSL: dbUrl?.includes('sslmode=require') || false,
      preview: dbUrl ? `${dbUrl.substring(0, 40)}...` : 'NOT_SET'
    }
  })

  // Test 2: Fresh Prisma Client Creation
  try {
    const freshClient = new PrismaClient({
      log: ['error'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    })

    results.tests.push({
      test: 'Prisma Client Creation',
      status: 'PASS',
      details: { created: true }
    })

    // Test 3: Basic Query
    try {
      const queryResult = await freshClient.$queryRaw`SELECT 1 as test, version() as db_version`
      results.tests.push({
        test: 'Database Query',
        status: 'PASS',
        details: { queryResult }
      })
    } catch (queryError) {
      results.tests.push({
        test: 'Database Query',
        status: 'FAIL',
        details: {
          error: queryError instanceof Error ? queryError.message : 'Unknown query error',
          errorType: queryError instanceof Error ? queryError.constructor.name : 'Unknown'
        }
      })
    }

    // Test 4: Connection Info
    try {
      await freshClient.$disconnect()
      results.tests.push({
        test: 'Client Disconnect',
        status: 'PASS',
        details: { disconnected: true }
      })
    } catch (disconnectError) {
      results.tests.push({
        test: 'Client Disconnect',
        status: 'FAIL',
        details: {
          error: disconnectError instanceof Error ? disconnectError.message : 'Unknown disconnect error'
        }
      })
    }

  } catch (clientError) {
    results.tests.push({
      test: 'Prisma Client Creation',
      status: 'FAIL',
      details: {
        error: clientError instanceof Error ? clientError.message : 'Unknown client error',
        errorType: clientError instanceof Error ? clientError.constructor.name : 'Unknown'
      }
    })
  }

  // Test 5: URL Format Validation
  if (dbUrl) {
    const urlTest = {
      test: 'URL Format Validation',
      status: 'INFO',
      details: {
        protocol: dbUrl.startsWith('postgresql://') ? 'VALID' : 'INVALID',
        username: dbUrl.includes('postgres.zpxltmcmtfqrgystdvxu') ? 'VALID' : 'INVALID',
        hostname: dbUrl.includes('db.zpxltmcmtfqrgystdvxu.supabase.co') ? 'VALID' : 'INVALID',
        port: dbUrl.includes(':5432') ? 'VALID' : 'INVALID',
        database: dbUrl.includes('/postgres') ? 'VALID' : 'INVALID',
        ssl: dbUrl.includes('sslmode=require') ? 'VALID' : 'INVALID'
      }
    }
    results.tests.push(urlTest)
  }

  return NextResponse.json(results)
}