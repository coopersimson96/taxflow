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

    // Find orphaned stores that might belong to this user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Look for organizations with pending link status that might match user's email
    const orphanedOrgs = await prisma.organization.findMany({
      where: {
        OR: [
          {
            settings: {
              path: ['pendingLink'],
              equals: true
            }
          },
          {
            settings: {
              path: ['shopOwnerEmail'],
              equals: session.user.email
            }
          },
          {
            settings: {
              path: ['customerEmail'], 
              equals: session.user.email
            }
          }
        ]
      },
      include: {
        integrations: {
          where: {
            type: 'SHOPIFY'
          }
        },
        members: true
      }
    })

    // Also find any integrations with PENDING status (since PENDING_USER_LINK doesn't exist in schema)
    const pendingIntegrations = await prisma.integration.findMany({
      where: {
        status: 'PENDING',
        type: 'SHOPIFY'
      },
      include: {
        organization: true
      }
    })

    return NextResponse.json({
      orphanedOrganizations: orphanedOrgs,
      pendingIntegrations: pendingIntegrations,
      userEmail: session.user.email
    })
  } catch (error) {
    console.error('Find orphaned stores error:', error)
    return NextResponse.json(
      { error: 'Failed to find orphaned stores' },
      { status: 500 }
    )
  }
}