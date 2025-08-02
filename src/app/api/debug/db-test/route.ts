import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const databaseUrl = process.env.DATABASE_URL
    
    if (!databaseUrl) {
      return NextResponse.json({
        success: false,
        error: 'DATABASE_URL not found',
      }, { status: 500 })
    }

    // Parse the database URL to check format
    const url = new URL(databaseUrl)
    const connectionInfo = {
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port,
      pathname: url.pathname,
      hasPassword: !!url.password,
      hasUsername: !!url.username
    }

    // Try to connect using node-postgres
    const { Client } = require('pg')
    const client = new Client({
      connectionString: databaseUrl,
      ssl: {
        rejectUnauthorized: false
      }
    })

    console.log('Attempting database connection...')
    await client.connect()
    console.log('Database connection successful')
    
    // Test a simple query
    const result = await client.query('SELECT NOW() as current_time')
    
    await client.end()
    console.log('Database connection closed')

    return NextResponse.json({
      success: true,
      connectionInfo,
      testQuery: result.rows[0],
      message: 'Database connection successful',
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error('Database connection error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorType: error?.constructor?.name,
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}