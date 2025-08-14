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

    console.log('🔗 Force linking store to user:', session.user.email)
    console.log('Organization ID:', organizationId)

    // Get the current user
    const user = await withWebhookDb(async (db) => {
      return await db.user.findUnique({
        where: { email: session.user.email! }
      })
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 })
    }

    // Get the organization and integration (regardless of status)
    const organization = await withWebhookDb(async (db) => {
      return await db.organization.findUnique({
        where: { id: organizationId },
        include: {
          integrations: {
            where: {
              type: 'SHOPIFY'
            }
          },
          members: {
            include: {
              user: true
            }
          }
        }
      })
    })

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    if (organization.integrations.length === 0) {
      return NextResponse.json({ error: 'No Shopify integration found for this organization' }, { status: 404 })
    }

    const integration = organization.integrations[0]

    // Check if user is already a member
    const isAlreadyMember = organization.members.some(member => member.userId === user.id)

    let userRole = 'ADMIN'
    
    if (!isAlreadyMember) {
      // Determine role - if no members exist, make this user OWNER, otherwise ADMIN
      userRole = organization.members.length === 0 ? 'OWNER' : 'ADMIN'
      
      // Add user as organization member
      await withWebhookDb(async (db) => {
        await db.organizationMember.create({
          data: {
            userId: user.id,
            organizationId: organization.id,
            role: userRole as 'OWNER' | 'ADMIN' | 'MEMBER'
          }
        })
      })
      
      console.log(`✅ Added user as ${userRole} to organization`)
    } else {
      const existingMember = organization.members.find(member => member.userId === user.id)
      userRole = existingMember?.role || 'MEMBER'
      console.log('✅ User already a member with role:', userRole)
    }

    // Update integration status to CONNECTED if it's not already
    if (integration.status !== 'CONNECTED') {
      await withWebhookDb(async (db) => {
        await db.integration.update({
          where: { id: integration.id },
          data: {
            status: 'CONNECTED'
          }
        })
      })
      console.log('✅ Updated integration status to CONNECTED')
    }

    // Clean up organization name if it has pending indicators
    if (organization.name.includes('(Pending Link)')) {
      await withWebhookDb(async (db) => {
        await db.organization.update({
          where: { id: organization.id },
          data: {
            name: organization.name.replace(' (Pending Link)', ''),
            slug: organization.slug.replace('-pending', ''),
            description: organization.description?.replace('Pending link: ', '')
          }
        })
      })
      console.log('✅ Cleaned up organization name')
    }

    console.log('✅ Successfully force-linked store to user')

    return NextResponse.json({
      success: true,
      message: 'Store successfully linked to your account',
      organizationId: organization.id,
      storeName: integration.name,
      userRole: userRole,
      wasAlreadyMember: isAlreadyMember
    })

  } catch (error) {
    console.error('❌ Force store linking error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorCode = (error as any)?.code || 'UNKNOWN'
    
    console.error('Error details:', {
      message: errorMessage,
      code: errorCode,
      stack: error instanceof Error ? error.stack : 'No stack'
    })
    
    return NextResponse.json(
      { 
        error: 'Failed to force-link store',
        details: errorMessage,
        code: errorCode
      },
      { status: 500 }
    )
  }
}