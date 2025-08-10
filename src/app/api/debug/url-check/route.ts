import { NextResponse } from 'next/server'

export async function GET() {
  const dbUrl = process.env.DATABASE_URL || ''
  
  return NextResponse.json({
    status: 'success',
    timestamp: new Date().toISOString(),
    data: {
      DATABASE_URL_SET: !!dbUrl,
      DATABASE_URL_LENGTH: dbUrl.length,
      // Show enough to identify which connection type
      HOSTNAME_CHECK: {
        isDirect: dbUrl.includes('db.zpxltmcmtfqrgystdvxu.supabase.co'),
        isPooler: dbUrl.includes('aws-0-ca-central-1.pooler.supabase.com'),
        hostnamePreview: dbUrl.split('@')[1]?.split('/')[0] || 'unknown'
      },
      PORT_CHECK: {
        port5432: dbUrl.includes(':5432'),
        port6543: dbUrl.includes(':6543')
      },
      SSL_CHECK: {
        hasSSL: dbUrl.includes('sslmode=require')
      },
      EXPECTED_NEW_URL: 'Should contain aws-0-ca-central-1.pooler.supabase.com:5432'
    }
  })
}