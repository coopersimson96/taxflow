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

    // Parse the URL to show components
    let urlInfo = {}
    try {
      const url = new URL(databaseUrl)
      urlInfo = {
        protocol: url.protocol,
        username: url.username,
        hostname: url.hostname,
        port: url.port,
        pathname: url.pathname,
        search: url.search
      }
    } catch (parseError) {
      urlInfo = { parseError: parseError instanceof Error ? parseError.message : 'Parse failed' }
    }

    return NextResponse.json({
      success: true,
      databaseUrl: databaseUrl,
      urlComponents: urlInfo,
      length: databaseUrl.length,
      expectedHostname: 'aws-0-ca-central-1.pooler.supabase.com',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}