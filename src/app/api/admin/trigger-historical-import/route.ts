import { NextRequest, NextResponse } from 'next/server'
import { HistoricalImportService } from '@/lib/services/historical-import-service'

export async function POST(req: NextRequest) {
  try {
    const { integrationId, options } = await req.json()
    
    if (!integrationId) {
      return NextResponse.json({ 
        error: 'Integration ID is required' 
      }, { status: 400 })
    }

    // Start historical import in background
    const result = await HistoricalImportService.importHistoricalOrders(integrationId, options)
    
    return NextResponse.json({
      success: true,
      message: 'Historical import completed successfully',
      result
    })
    
  } catch (error) {
    console.error('Historical import error:', error)
    return NextResponse.json({ 
      error: 'Failed to import historical orders',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const integrationId = searchParams.get('integrationId')
    
    if (!integrationId) {
      return NextResponse.json({ 
        error: 'Integration ID is required' 
      }, { status: 400 })
    }

    // Get import status
    const status = await HistoricalImportService.getImportStatus(integrationId)
    
    return NextResponse.json({
      success: true,
      status: status || { status: 'not_started' }
    })
    
  } catch (error) {
    console.error('Get import status error:', error)
    return NextResponse.json({ 
      error: 'Failed to get import status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}