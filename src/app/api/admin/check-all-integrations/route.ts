import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { withWebhookDb } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get all Shopify integrations with their organizations and members
    const allIntegrations = await withWebhookDb(async (db) => {
      return await db.integration.findMany({
        where: {
          type: 'SHOPIFY'
        },
        include: {
          organization: {
            include: {
              members: {
                include: {
                  user: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
    })

    // Get current user
    const currentUser = await withWebhookDb(async (db) => {
      return await db.user.findUnique({
        where: { email: session.user.email! }
      })
    })

    const integrationDetails = allIntegrations.map(integration => {
      const credentials = integration.credentials as any
      const shopInfo = credentials?.shopInfo || {}
      
      return {
        id: integration.id,
        name: integration.name,
        status: integration.status,
        organizationId: integration.organizationId,
        organizationName: integration.organization.name,
        shopDomain: credentials?.shop || shopInfo?.domain || shopInfo?.myshopify_domain,
        shopOwnerEmail: shopInfo?.email,
        customerEmail: shopInfo?.customer_email,
        shopOwner: shopInfo?.shop_owner,
        createdAt: integration.createdAt,
        lastSyncAt: integration.lastSyncAt,
        members: integration.organization.members.map(member => ({
          userId: member.userId,
          email: member.user.email,
          name: member.user.name,
          role: member.role
        })),
        isUserMember: integration.organization.members.some(member => member.userId === currentUser?.id),
        isPending: integration.status === 'PENDING_USER_LINK'
      }
    })

    return NextResponse.json({
      success: true,
      currentUser: {
        id: currentUser?.id,
        email: session.user.email
      },
      totalIntegrations: allIntegrations.length,
      integrations: integrationDetails,
      pendingIntegrations: integrationDetails.filter(i => i.isPending),
      userAccessibleStores: integrationDetails.filter(i => i.isUserMember).length
    })

  } catch (error) {
    console.error('Check all integrations error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to check integrations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}