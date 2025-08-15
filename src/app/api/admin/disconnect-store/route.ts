import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { withWebhookDb } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { integrationId, reason } = await request.json()

    if (!integrationId) {
      return NextResponse.json({ error: 'Integration ID required' }, { status: 400 })
    }

    console.log('🔌 Disconnecting integration:', integrationId, 'Reason:', reason)

    // Get the integration with full details
    const integration = await withWebhookDb(async (db) => {
      return await db.integration.findUnique({
        where: { id: integrationId },
        include: {
          organization: {
            include: {
              members: {
                where: {
                  user: {
                    email: session.user.email!
                  }
                }
              }
            }
          }
        }
      })
    })

    if (!integration || integration.organization.members.length === 0) {
      return NextResponse.json({ error: 'Integration not found or access denied' }, { status: 404 })
    }

    // Update integration status to disconnected
    const updatedIntegration = await withWebhookDb(async (db) => {
      return await db.integration.update({
        where: { id: integrationId },
        data: {
          status: 'DISCONNECTED',
          lastSyncAt: null,
          config: {
            ...(integration.config as any || {}),
            disconnectedAt: new Date().toISOString(),
            disconnectedBy: session.user.email,
            disconnectReason: reason || 'Manual disconnect',
            previousStatus: integration.status
          }
        }
      })
    })

    // Optionally clean up related data (transactions, etc.)
    // For now, we'll keep the data but mark it as disconnected
    
    console.log('✅ Successfully disconnected integration:', integrationId)

    return NextResponse.json({
      success: true,
      message: 'Store successfully disconnected',
      integration: {
        id: updatedIntegration.id,
        name: updatedIntegration.name,
        status: updatedIntegration.status,
        organizationId: updatedIntegration.organizationId
      }
    })

  } catch (error) {
    console.error('❌ Store disconnect error:', error)
    
    const errorDetails = {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined
    }
    
    console.error('Error details:', errorDetails)
    
    return NextResponse.json(
      { 
        error: 'Failed to disconnect store',
        details: errorDetails.message
      },
      { status: 500 }
    )
  }
}