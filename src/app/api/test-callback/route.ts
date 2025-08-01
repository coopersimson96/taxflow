import { NextRequest, NextResponse } from 'next/server'

// Simple test endpoint to verify callback URL structure works
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const allParams = Object.fromEntries(searchParams.entries())
    
    console.log('Test callback reached with params:', allParams)
    
    return NextResponse.json({
      success: true,
      message: 'Test callback endpoint working',
      params: allParams,
      url: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Test callback error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}