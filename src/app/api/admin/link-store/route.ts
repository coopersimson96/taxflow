import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { withWebhookDb } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { organizationId } = body

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }

    console.log('🔗 Linking store to user:', session.user.email)
    console.log('Organization ID:', organizationId)

    // Get the current user
    const user = await withWebhookDb(async (db) => {
      return await db.user.findUnique({
        where: { email: session.user.email! }
      })
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get the pending organization and integration
    const organization = await withWebhookDb(async (db) => {
      return await db.organization.findUnique({
        where: { id: organizationId },
        include: {
          integrations: {
            where: {
              type: 'SHOPIFY',
              status: 'PENDING_USER_LINK'
            }
          },
          members: true
        }
      })
    })

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    if (organization.integrations.length === 0) {
      return NextResponse.json({ error: 'No pending integration found' }, { status: 404 })
    }

    const integration = organization.integrations[0]

    // Check if user is already a member
    const isAlreadyMember = organization.members.some(member => member.userId === user.id)

    if (!isAlreadyMember) {
      // Add user as organization member
      await withWebhookDb(async (db) => {
        await db.organizationMember.create({
          data: {
            userId: user.id,
            organizationId: organization.id,
            role: organization.members.length === 0 ? 'OWNER' : 'ADMIN'
          }
        })
      })
    }

    // Update integration status and organization
    await withWebhookDb(async (db) => {
      // Update integration status
      await db.integration.update({
        where: { id: integration.id },
        data: {
          status: 'CONNECTED'
        }
      })

      // Update organization to remove pending status
      const currentSettings = organization.settings as any
      const newSettings = { ...currentSettings }
      delete newSettings.pendingLink
      
      await db.organization.update({
        where: { id: organization.id },
        data: {
          name: organization.name.replace(' (Pending Link)', ''),
          slug: organization.slug.replace('-pending', ''),
          description: organization.description?.replace('Pending link: ', ''),
          settings: newSettings
        }
      })
    })

    console.log('✅ Successfully linked store to user')

    return NextResponse.json({
      success: true,
      message: 'Store successfully linked to your account',
      organizationId: organization.id,
      storeName: integration.name,
      userRole: organization.members.length === 0 ? 'OWNER' : 'ADMIN'
    })

  } catch (error) {
    console.error('❌ Store linking error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to link store',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}