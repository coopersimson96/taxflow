import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get user with organizations
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
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

    // Get all integrations
    const integrations = await prisma.integration.findMany({
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

    // Check each integration's emails
    const integrationDetails = integrations.map(integration => {
      const credentials = integration.credentials as any
      return {
        id: integration.id,
        name: integration.name,
        organizationId: integration.organizationId,
        shopName: credentials.shopInfo?.name,
        shopDomain: credentials.shopInfo?.domain,
        shopOwnerEmail: credentials.shopInfo?.email,
        customerEmail: credentials.shopInfo?.customer_email,
        shopOwner: credentials.shopInfo?.shop_owner,
        createdAt: integration.createdAt
      }
    })

    return NextResponse.json({
      currentUser: {
        email: session.user.email,
        organizationMemberships: user?.organizations?.length || 0,
        accessibleStores: user?.organizations?.reduce((total, membership) => 
          total + membership.organization.integrations.length, 0) || 0
      },
      connectedIntegrations: integrationDetails,
      totalIntegrations: integrations.length
    })

  } catch (error) {
    console.error('Check connection error:', error)
    return NextResponse.json(
      { error: 'Failed to check connections' },
      { status: 500 }
    )
  }
}