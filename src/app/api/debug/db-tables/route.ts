import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const databaseUrl = process.env.DATABASE_URL
    
    if (!databaseUrl) {
      return NextResponse.json({
        success: false,
        error: 'DATABASE_URL not found',
      }, { status: 500 })
    }

    // Use node-postgres to check tables
    const { Client } = require('pg')
    const client = new Client({
      connectionString: databaseUrl,
      ssl: {
        rejectUnauthorized: false
      }
    })

    await client.connect()
    
    // Check what tables exist
    const tablesResult = await client.query(`
      SELECT table_name, table_schema 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `)

    // Check if specific tables exist
    const expectedTables = [
      'users', 'organizations', 'integrations', 'transactions', 
      'accounts', 'sessions', 'organization_members'
    ]
    
    const existingTables = tablesResult.rows.map((row: any) => row.table_name)
    const missingTables = expectedTables.filter(table => !existingTables.includes(table))

    await client.end()

    return NextResponse.json({
      success: true,
      connection: 'OK',
      existingTables: existingTables,
      expectedTables: expectedTables,
      missingTables: missingTables,
      needsMigration: missingTables.length > 0,
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}