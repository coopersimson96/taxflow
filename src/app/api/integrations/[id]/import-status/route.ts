import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { HistoricalImportService } from '@/lib/services/historical-import'
import { prisma } from '@/lib/prisma'

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

    // Verify user has access to this integration
    const integration = await prisma.integration.findUnique({
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

    if (!integration || integration.organization.members.length === 0) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    // Get import progress
    const progress = HistoricalImportService.getImportProgress(integrationId)
    
    // If no active import, check if it was completed previously
    if (!progress) {
      const config = integration.config as any
      if (config?.historicalImportCompleted) {
        return NextResponse.json({
          status: 'completed',
          completed: true,
          importDate: config.historicalImportDate,
          range: config.historicalImportRange
        })
      } else {
        return NextResponse.json({
          status: 'not_started',
          completed: false
        })
      }
    }

    return NextResponse.json({
      status: progress.status,
      totalOrders: progress.totalOrders,
      processedOrders: progress.processedOrders,
      percentComplete: progress.totalOrders > 0 
        ? Math.round((progress.processedOrders / progress.totalOrders) * 100)
        : 0,
      startDate: progress.startDate,
      endDate: progress.endDate,
      error: progress.error
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

    // Verify user has access to this integration
    const integration = await prisma.integration.findUnique({
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
    const existingProgress = HistoricalImportService.getImportProgress(integrationId)
    if (existingProgress && existingProgress.status === 'in_progress') {
      return NextResponse.json({
        success: false,
        error: 'Import is already running for this integration'
      })
    }

    // Start the historical import (12 months)
    const importPromise = HistoricalImportService.importHistoricalOrders(integrationId, 12)
    
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