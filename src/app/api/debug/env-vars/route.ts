import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const dbUrl = process.env.DATABASE_URL
    
    return NextResponse.json({
      status: 'success',
      data: {
        DATABASE_URL_SET: !!dbUrl,
        DATABASE_URL_LENGTH: dbUrl?.length || 0,
        DATABASE_URL_PREVIEW: dbUrl ? `${dbUrl.substring(0, 30)}...${dbUrl.substring(dbUrl.length - 20)}` : 'NOT_SET',
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
        DB_ENV_VARS: Object.keys(process.env).filter(key => key.startsWith('DB')),
        ALL_ENV_COUNT: Object.keys(process.env).length
      }
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}