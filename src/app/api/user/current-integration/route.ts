import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { IntegrationService } from '@/lib/services/integration-service'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get storeId from query params
    const searchParams = request.nextUrl.searchParams
    const storeId = searchParams.get('storeId')

    console.log('🔍 Looking for integration for user:', session.user.email, 'storeId:', storeId)

    // Get user's current integration (with optional storeId)
    const integration = await IntegrationService.findUserShopifyIntegration(session.user.email, storeId || undefined)
    
    if (!integration) {
      // Debug: Let's see what integrations exist for this user
      const debugInfo = await IntegrationService.getUserIntegrationWithContext(session.user.email)
      console.log('❌ No integration found. Debug info:', debugInfo)
      
      return NextResponse.json({
        integration: null,
        message: 'No Shopify store connected',
        debug: debugInfo?.debugInfo || null
      })
    }

    const credentials = integration.credentials as any
    
    console.log('✅ Returning integration:', {
      id: integration.id,
      status: integration.status,
      name: integration.name
    })
    
    return NextResponse.json({
      integration: {
        id: integration.id,
        name: integration.name,
        type: integration.type,
        status: integration.status,
        shopDomain: credentials?.shop || null,
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