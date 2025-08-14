import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { withWebhookDb } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get user with their organization memberships and stores
    const user = await withWebhookDb(async (db) => {
      return await db.user.findUnique({
        where: { email: session.user.email! },
        include: {
          organizations: {
            include: {
              organization: {
                include: {
                  integrations: {
                    where: {
                      type: 'SHOPIFY',
                      status: 'CONNECTED'
                    }
                  }
                }
              }
            }
          }
        }
      })
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const stores = user.organizations.flatMap(membership => 
      membership.organization.integrations.map(integration => {
        const credentials = integration.credentials as any
        return {
          integrationId: integration.id,
          organizationId: integration.organizationId,
          organizationName: integration.organization.name,
          storeName: credentials?.shopInfo?.name || integration.name,
          shopDomain: credentials?.shopInfo?.domain || credentials?.shopInfo?.myshopify_domain,
          role: membership.role,
          createdAt: integration.createdAt,
          lastSyncAt: integration.lastSyncAt
        }
      })
    )

    return NextResponse.json({
      success: true,
      currentUser: session.user.email,
      totalStores: stores.length,
      stores: stores.sort((a, b) => a.storeName.localeCompare(b.storeName))
    })

  } catch (error) {
    console.error('List stores error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to list stores',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}