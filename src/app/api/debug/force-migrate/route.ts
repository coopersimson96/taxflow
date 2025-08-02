import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { promisify } from 'util'

export const dynamic = 'force-dynamic'

const execAsync = promisify(require('child_process').exec)

export async function GET(request: NextRequest) {
  try {
    console.log('Starting force migration with prisma db push...')
    
    // Use prisma db push to force sync the schema
    const { stdout, stderr } = await execAsync('npx prisma db push --force-reset', {
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL
      },
      cwd: process.cwd(),
      timeout: 60000 // 60 second timeout
    })
    
    console.log('Prisma stdout:', stdout)
    if (stderr) console.log('Prisma stderr:', stderr)
    
    return NextResponse.json({
      success: true,
      message: 'Database force migration completed',
      output: stdout,
      errors: stderr || null,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Force migration error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}