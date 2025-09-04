import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { organizationId } = body

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Find the organization
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        members: true,
        integrations: true
      }
    })

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Check if user is already a member
    const existingMember = organization.members.find(m => m.userId === user.id)
    if (!existingMember) {
      // Add user as owner of this organization
      await prisma.organizationMember.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: 'OWNER'
        }
      })
    }

    // Update organization to remove pending link status
    await prisma.organization.update({
      where: { id: organization.id },
      data: {
        settings: {
          ...(organization.settings as any || {}),
          pendingLink: false
        }
      }
    })

    // Update any PENDING_USER_LINK integrations to CONNECTED
    if (organization.integrations.length > 0) {
      await prisma.integration.updateMany({
        where: {
          organizationId: organization.id,
          status: 'PENDING_USER_LINK'
        },
        data: {
          status: 'CONNECTED'
        }
      })
    }

    return NextResponse.json({
      success: true,
      organization: {
        id: organization.id,
        name: organization.name
      }
    })
  } catch (error) {
    console.error('Link store error:', error)
    return NextResponse.json(
      { error: 'Failed to link store' },
      { status: 500 }
    )
  }
}