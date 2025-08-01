import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Test direct connection without Prisma
    const databaseUrl = process.env.DATABASE_URL
    
    if (!databaseUrl) {
      return NextResponse.json({
        success: false,
        error: 'DATABASE_URL environment variable not found',
        timestamp: new Date().toISOString(),
      }, { status: 500 })
    }

    // Parse the DATABASE_URL to check format
    let parsedUrl
    try {
      parsedUrl = new URL(databaseUrl)
    } catch (parseError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid DATABASE_URL format',
        details: parseError instanceof Error ? parseError.message : 'Unknown parse error',
        timestamp: new Date().toISOString(),
      }, { status: 500 })
    }

    // Try a simple connection test using node-postgres
    const { Client } = require('pg')
    const client = new Client({
      connectionString: databaseUrl,
      ssl: {
        rejectUnauthorized: false
      }
    })

    await client.connect()
    const result = await client.query('SELECT 1 as test')
    await client.end()

    return NextResponse.json({
      success: true,
      connection: 'OK',
      host: parsedUrl.hostname,
      port: parsedUrl.port,
      database: parsedUrl.pathname.substring(1),
      testResult: result.rows[0],
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}