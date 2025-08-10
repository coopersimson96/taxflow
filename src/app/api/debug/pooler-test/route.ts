import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

export async function GET() {
  const results = {
    timestamp: new Date().toISOString(),
    tests: [] as any[]
  }

  // Test different connection URLs to find what works
  const connectionUrls = [
    {
      name: 'Direct Connection (Current)',
      url: 'postgresql://postgres.zpxltmcmtfqrgystdvxu:Supabasetaxflow45123@db.zpxltmcmtfqrgystdvxu.supabase.co:5432/postgres?sslmode=require'
    },
    {
      name: 'Session Pooler (Port 5432)', 
      url: 'postgresql://postgres.zpxltmcmtfqrgystdvxu:Supabasetaxflow45123@aws-0-ca-central-1.pooler.supabase.com:5432/postgres?sslmode=require'
    },
    {
      name: 'Transaction Pooler (Port 6543)',
      url: 'postgresql://postgres.zpxltmcmtfqrgystdvxu:Supabasetaxflow45123@aws-0-ca-central-1.pooler.supabase.com:6543/postgres?sslmode=require'
    }
  ]

  for (const connectionTest of connectionUrls) {
    try {
      const testClient = new PrismaClient({
        log: ['error'],
        datasources: {
          db: {
            url: connectionTest.url
          }
        }
      })

      try {
        const queryResult = await testClient.$queryRaw`SELECT 1 as test, 'Connection successful' as status`
        results.tests.push({
          test: connectionTest.name,
          status: 'PASS',
          details: { queryResult, success: true }
        })
      } catch (queryError) {
        results.tests.push({
          test: connectionTest.name,
          status: 'FAIL',
          details: {
            error: queryError instanceof Error ? queryError.message : 'Unknown query error',
            errorType: queryError instanceof Error ? queryError.constructor.name : 'Unknown'
          }
        })
      } finally {
        await testClient.$disconnect()
      }

    } catch (clientError) {
      results.tests.push({
        test: connectionTest.name,
        status: 'FAIL',
        details: {
          error: clientError instanceof Error ? clientError.message : 'Unknown client error',
          errorType: clientError instanceof Error ? clientError.constructor.name : 'Unknown'
        }
      })
    }

    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  return NextResponse.json(results)
}