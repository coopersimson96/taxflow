import { NextResponse } from 'next/server'

export async function GET() {
  const results = {
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      VERCEL_REGION: process.env.VERCEL_REGION,
      VERCEL_URL: process.env.VERCEL_URL,
    },
    tests: [] as any[]
  }

  // Test 1: DNS Resolution
  try {
    const hostname = 'db.zpxltmcmtfqrgystdvxu.supabase.co'
    // We can't use native DNS resolution in Edge Runtime, but we can test HTTP connectivity
    
    results.tests.push({
      test: 'Hostname Check',
      status: 'INFO',
      details: { hostname, note: 'DNS resolution not testable in Edge Runtime' }
    })
  } catch (error) {
    results.tests.push({
      test: 'Hostname Check',
      status: 'FAIL',
      details: { error: error instanceof Error ? error.message : 'Unknown DNS error' }
    })
  }

  // Test 2: Basic Network Connectivity (HTTP test to Supabase)
  try {
    const supabaseUrl = 'https://zpxltmcmtfqrgystdvxu.supabase.co'
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpweGx0bWNtdGZxcmd5c3Rkdnh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2MTA2ODIsImV4cCI6MjA3MDE4NjY4Mn0.F7iQpVa6lBDGNdA5HHaWtKBV6cUCjGNmm6yYoSiKqJQ'
      },
      signal: controller.signal
    })

    clearTimeout(timeoutId)
    
    results.tests.push({
      test: 'Supabase HTTP Connectivity',
      status: response.ok ? 'PASS' : 'PARTIAL',
      details: {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      }
    })
  } catch (fetchError) {
    results.tests.push({
      test: 'Supabase HTTP Connectivity',
      status: 'FAIL',
      details: {
        error: fetchError instanceof Error ? fetchError.message : 'Unknown fetch error',
        name: fetchError instanceof Error ? fetchError.name : 'Unknown'
      }
    })
  }

  // Test 3: Vercel Runtime Information
  results.tests.push({
    test: 'Vercel Runtime Info',
    status: 'INFO',
    details: {
      runtime: process.env.VERCEL ? 'Vercel Edge/Serverless' : 'Local Development',
      region: process.env.VERCEL_REGION || 'unknown',
      timestamp: Date.now(),
      userAgent: 'Vercel Edge Runtime'
    }
  })

  return NextResponse.json(results)
}