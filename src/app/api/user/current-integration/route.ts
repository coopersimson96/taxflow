import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { IntegrationService } from '@/lib/services/integration-service'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's current integration
    const integration = await IntegrationService.getUserIntegration(session.user.email)
    
    if (!integration) {
      return NextResponse.json({
        integration: null,
        message: 'No Shopify store connected'
      })
    }

    return NextResponse.json({
      integration: {
        id: integration.id,
        name: integration.name,
        type: integration.type,
        status: integration.status,
        shopDomain: integration.credentials?.shop,
        lastSyncAt: integration.lastSyncAt,
        syncStatus: integration.syncStatus
      }
    })

  } catch (error) {
    console.error('Get current integration error:', error)
    return NextResponse.json({ 
      error: 'Failed to get current integration',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}