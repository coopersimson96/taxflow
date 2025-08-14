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

    // Get user with all related data
    const userWithOrgs = await withWebhookDb(async (db) => {
      const user = await db.user.findUnique({
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
      return user
    })

    if (!userWithOrgs) {
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 })
    }

    // Get all Shopify integrations to see what exists
    const allIntegrations = await withWebhookDb(async (db) => {
      return await db.integration.findMany({
        where: {
          type: 'SHOPIFY',
          status: 'CONNECTED'
        },
        select: {
          id: true,
          name: true,
          organizationId: true,
          credentials: true,
          createdAt: true
        }
      })
    })

    // Check for integrations that might match this user's email
    const potentialMatches = allIntegrations.filter(integration => {
      const credentials = integration.credentials as any
      const shopEmail = credentials?.shopInfo?.email
      const customerEmail = credentials?.shopInfo?.customer_email
      return shopEmail === session.user.email || customerEmail === session.user.email
    })

    return NextResponse.json({
      currentUser: {
        email: session.user.email,
        id: userWithOrgs.id,
        organizationMemberships: userWithOrgs.organizations.length,
        accessibleStores: userWithOrgs.organizations.reduce((total, membership) => 
          total + membership.organization.integrations.length, 0)
      },
      userOrganizations: userWithOrgs.organizations.map(membership => ({
        role: membership.role,
        organizationId: membership.organizationId,
        organizationName: membership.organization.name,
        connectedIntegrations: membership.organization.integrations.length,
        integrations: membership.organization.integrations.map(integration => ({
          id: integration.id,
          name: integration.name
        }))
      })),
      allShopifyIntegrations: allIntegrations.length,
      potentialEmailMatches: potentialMatches.length,
      potentialMatches: potentialMatches.map(integration => ({
        id: integration.id,
        name: integration.name,
        organizationId: integration.organizationId,
        shopEmail: (integration.credentials as any)?.shopInfo?.email,
        customerEmail: (integration.credentials as any)?.shopInfo?.customer_email
      }))
    })

  } catch (error) {
    console.error('User orgs debug error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to check user organizations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}