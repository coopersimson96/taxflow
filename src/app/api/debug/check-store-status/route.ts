import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get the specific integration
    const searchParams = request.nextUrl.searchParams
    const integrationId = searchParams.get('integrationId') || 'cmfw211kn0000jp041xnylsib'

    // Direct database query to check the actual status
    const integration = await prisma.integration.findUnique({
      where: { id: integrationId },
      include: {
        organization: true
      }
    })

    // Also check all integrations for this user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        organizations: {
          include: {
            organization: {
              include: {
                integrations: true  // Get ALL integrations, no filter
              }
            }
          }
        }
      }
    })

    const allIntegrations = user?.organizations.flatMap(om => 
      om.organization.integrations.map(int => ({
        id: int.id,
        name: int.name,
        status: int.status,
        type: int.type,
        organizationName: om.organization.name,
        updatedAt: int.updatedAt,
        config: int.config
      }))
    ) || []

    // Check what the actual API endpoints return
    const userStoresResponse = await fetch(`${request.nextUrl.origin}/api/user/stores`, {
      headers: {
        cookie: request.headers.get('cookie') || ''
      }
    })
    const userStoresData = await userStoresResponse.json()

    const debugListResponse = await fetch(`${request.nextUrl.origin}/api/debug/list-stores`, {
      headers: {
        cookie: request.headers.get('cookie') || ''
      }
    })
    const debugListData = await debugListResponse.json()

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      specificIntegration: integration ? {
        id: integration.id,
        name: integration.name,
        status: integration.status,
        type: integration.type,
        organization: integration.organization.name,
        updatedAt: integration.updatedAt,
        config: integration.config
      } : 'Not found',
      allIntegrations: {
        total: allIntegrations.length,
        connected: allIntegrations.filter(i => i.status === 'CONNECTED').length,
        disconnected: allIntegrations.filter(i => i.status === 'DISCONNECTED').length,
        details: allIntegrations
      },
      apiResponses: {
        userStores: {
          count: userStoresData.stores?.length || 0,
          stores: userStoresData.stores
        },
        debugList: {
          count: debugListData.stores?.length || 0,
          stores: debugListData.stores
        }
      },
      diagnostics: {
        issue: allIntegrations.filter(i => i.status === 'DISCONNECTED').length > 0 ? 
          'Found DISCONNECTED integrations that might be showing as connected' : 
          'All integrations appear to be properly filtered',
        possibleCauses: [
          'Browser cache holding old data',
          'React state not refreshing',
          'localStorage holding stale data'
        ],
        recommendations: [
          'Clear browser cache and localStorage',
          'Hard refresh the page (Cmd+Shift+R)',
          'Check if using embedded/Polaris view which uses different endpoint'
        ]
      }
    })
  } catch (error) {
    console.error('Store status check error:', error)
    return NextResponse.json(
      { error: 'Failed to check store status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}