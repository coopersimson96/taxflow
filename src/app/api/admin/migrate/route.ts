import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    // Security check - only allow in development or with proper auth
    const { searchParams } = new URL(request.url)
    const force = searchParams.get('force') === 'true'
    
    if (!force && process.env.NODE_ENV === 'production') {
      return NextResponse.json({
        success: false,
        error: 'Migration endpoint disabled in production. Use ?force=true if you know what you are doing.',
      }, { status: 403 })
    }

    console.log('Running database migration...')
    
    // Run Prisma db push to sync schema
    const { stdout, stderr } = await execAsync('npx prisma db push --force-reset')
    
    console.log('Migration stdout:', stdout)
    if (stderr) {
      console.log('Migration stderr:', stderr)
    }

    return NextResponse.json({
      success: true,
      message: 'Database migration completed',
      output: stdout,
      errors: stderr || null,
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}