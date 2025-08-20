import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { HistoricalImportService } from '@/lib/services/historical-import'
import { withWebhookDb } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const integrationId = params.id
    console.log('📊 Import status request for integration:', integrationId)

    // Verify user has access to this integration
    const integration = await withWebhookDb(async (db) => {
      return await db.integration.findUnique({
        where: { id: integrationId },
        include: {
          organization: {
            include: {
              members: {
                where: {
                  user: {
                    email: session.user.email
                  }
                }
              }
            }
          }
        }
      })
    })

    if (!integration || integration.organization.members.length === 0) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    // Get import status using new service
    const status = await HistoricalImportService.getImportStatus(integrationId)
    
    if (!status) {
      return NextResponse.json({
        status: 'not_started',
        completed: false
      })
    }

    return NextResponse.json({
      status: status.status,
      progress: status.progress || 0,
      totalImported: status.totalImported || 0,
      startedAt: status.startedAt,
      completedAt: status.completedAt,
      failedAt: status.failedAt,
      error: status.error
    })

  } catch (error) {
    console.error('Import status error:', error)
    return NextResponse.json(
      { error: 'Failed to get import status' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const integrationId = params.id
    console.log('📊 Import status request for integration:', integrationId)

    // Verify user has access to this integration
    const integration = await withWebhookDb(async (db) => {
      return await db.integration.findUnique({
        where: { id: integrationId },
        include: {
          organization: {
            include: {
              members: {
                where: {
                  user: {
                    email: session.user.email
                  }
                }
              }
            }
          }
        }
      })
    })

    if (!integration || integration.organization.members.length === 0) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    if (integration.type !== 'SHOPIFY') {
      return NextResponse.json({ error: 'Only Shopify integrations support historical import' }, { status: 400 })
    }

    if (integration.status !== 'CONNECTED') {
      return NextResponse.json({ error: 'Integration must be connected to import data' }, { status: 400 })
    }

    console.log('🚀 Starting manual historical import for integration:', integrationId)

    // Check if import is already running
    const existingStatus = await HistoricalImportService.getImportStatus(integrationId)
    if (existingStatus && existingStatus.status === 'in_progress') {
      return NextResponse.json({
        success: false,
        error: 'Import is already running for this integration'
      })
    }

    // Start the historical import (90 days)
    const importPromise = HistoricalImportService.importHistoricalOrders(integrationId, {
      daysBack: 90,
      batchSize: 50,
      maxOrders: 1000
    })
    
    // Don't await the full import - let it run in background
    importPromise
      .then(result => {
        console.log('✅ Historical import completed for integration:', integrationId)
        console.log('Import result:', result)
      })
      .catch(error => {
        console.error('❌ Historical import failed for integration:', integrationId, error)
      })

    return NextResponse.json({
      success: true,
      message: 'Historical import started successfully',
      integrationId,
      note: 'Import is running in the background. Check status periodically.'
    })

  } catch (error) {
    console.error('Manual import trigger error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to trigger import',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}