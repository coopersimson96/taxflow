import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { withWebhookDb } from '@/lib/prisma'
import { UserService } from '@/lib/services/user-service'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    console.log('🔧 Starting user sync fix for:', session.user.email)

    // 1. First, ensure user exists in database
    let user = await withWebhookDb(async (db) => {
      return await db.user.findUnique({
        where: { email: session.user.email! }
      })
    })

    if (!user) {
      console.log('👤 Creating missing user record...')
      user = await UserService.upsertUserFromOAuth({
        email: session.user.email,
        name: session.user.name || undefined,
        avatar: session.user.image || undefined,
      })
      console.log('✅ User created:', user.id)
    } else {
      console.log('✅ User already exists:', user.id)
    }

    // 2. Find any Shopify integrations that should belong to this user
    const matchingIntegrations = await withWebhookDb(async (db) => {
      return await db.integration.findMany({
        where: {
          type: 'SHOPIFY',
          status: 'CONNECTED',
          OR: [
            {
              credentials: {
                path: ['shopInfo', 'email'],
                equals: session.user.email!
              }
            },
            {
              credentials: {
                path: ['shopInfo', 'customer_email'],
                equals: session.user.email!
              }
            }
          ]
        },
        include: {
          organization: {
            include: {
              members: true
            }
          }
        }
      })
    })

    console.log(`🔍 Found ${matchingIntegrations.length} matching integrations`)

    // 3. Add user as member to organizations where they're not already a member
    const membershipsCreated = []
    
    for (const integration of matchingIntegrations) {
      const isAlreadyMember = integration.organization.members.some(
        member => member.userId === user!.id
      )
      
      if (!isAlreadyMember) {
        console.log(`🏢 Adding user to organization: ${integration.organization.name}`)
        
        await withWebhookDb(async (db) => {
          await db.organizationMember.create({
            data: {
              userId: user!.id,
              organizationId: integration.organizationId,
              role: integration.organization.members.length === 0 ? 'OWNER' : 'ADMIN'
            }
          })
        })
        
        membershipsCreated.push({
          organizationId: integration.organizationId,
          organizationName: integration.organization.name,
          integrationName: integration.name,
          role: integration.organization.members.length === 0 ? 'OWNER' : 'ADMIN'
        })
      } else {
        console.log(`✅ User already member of: ${integration.organization.name}`)
      }
    }

    // 4. Get final state
    const finalUser = await withWebhookDb(async (db) => {
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

    return NextResponse.json({
      success: true,
      message: 'User sync fix completed',
      details: {
        userEmail: session.user.email,
        userId: user.id,
        matchingIntegrations: matchingIntegrations.length,
        membershipsCreated: membershipsCreated.length,
        newMemberships: membershipsCreated,
        finalState: {
          organizationMemberships: finalUser?.organizations.length || 0,
          accessibleStores: finalUser?.organizations.reduce((total, membership) => 
            total + membership.organization.integrations.length, 0) || 0
        }
      }
    })

  } catch (error) {
    console.error('❌ User sync fix error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fix user sync',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}