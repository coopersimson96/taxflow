import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  console.log('Callback test endpoint hit')
  console.log('URL:', request.url)
  console.log('Method:', request.method)
  
  const searchParams = request.nextUrl.searchParams
  const allParams = Object.fromEntries(searchParams.entries())
  
  return NextResponse.json({
    success: true,
    message: 'Callback test working',
    url: request.url,
    params: allParams,
    timestamp: new Date().toISOString()
  })
}