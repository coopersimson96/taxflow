import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        organizations: {
          include: {
            organization: {
              include: {
                integrations: {
                  where: {
                    type: 'SHOPIFY'
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Transform the data to a simpler format
    const stores = user.organizations.map(org => {
      const shopifyIntegration = org.organization.integrations[0]
      const credentials = shopifyIntegration?.credentials as any || {}
      
      return {
        id: shopifyIntegration?.id || org.organizationId,
        organizationId: org.organizationId,
        name: org.organization.name,
        shop: credentials.shop || 'Unknown',
        status: shopifyIntegration?.status || 'DISCONNECTED',
        role: org.role
      }
    })

    return NextResponse.json({ 
      stores,
      currentUserEmail: session.user.email 
    })
  } catch (error) {
    console.error('Get stores error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stores' },
      { status: 500 }
    )
  }
}