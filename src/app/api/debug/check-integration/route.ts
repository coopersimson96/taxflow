import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { withWebhookDb } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 })
    }

    const userEmail = session.user.email
    console.log('🔍 DEBUG: Checking integration for user:', userEmail)

    // Step 1: Check if user exists
    const user = await withWebhookDb(async (db) => {
      return await db.user.findUnique({
        where: { email: userEmail },
        include: {
          organizations: {
            include: {
              organization: {
                include: {
                  integrations: {
                    where: { type: 'SHOPIFY' }
                  }
                }
              }
            }
          }
        }
      })
    })

    if (!user) {
      console.log('❌ User not found in database')
      return NextResponse.json({
        status: 'error',
        message: 'User not found in database',
        userEmail,
        solution: 'User needs to be created in database'
      })
    }

    console.log('✅ User found:', { id: user.id, email: user.email })

    // Step 2: Check organizations
    if (!user.organizations || user.organizations.length === 0) {
      console.log('❌ User has no organization memberships')
      return NextResponse.json({
        status: 'error',
        message: 'User has no organization memberships',
        userEmail,
        userId: user.id,
        solution: 'User needs to be added to an organization'
      })
    }

    console.log(`✅ User has ${user.organizations.length} organization(s)`)

    // Step 3: Check for Shopify integrations
    const allIntegrations = user.organizations.flatMap(
      membership => membership.organization.integrations
    )

    if (allIntegrations.length === 0) {
      console.log('❌ No Shopify integrations found')
      return NextResponse.json({
        status: 'error',
        message: 'No Shopify integrations found',
        userEmail,
        organizationCount: user.organizations.length,
        solution: 'Connect a Shopify store'
      })
    }

    console.log(`✅ Found ${allIntegrations.length} Shopify integration(s)`)

    // Step 4: Return integration details
    const integration = allIntegrations[0] // Use first integration
    console.log('📋 Integration details:', {
      id: integration.id,
      name: integration.name,
      status: integration.status,
      syncStatus: integration.syncStatus
    })

    return NextResponse.json({
      status: 'success',
      message: 'Integration found successfully',
      integration: {
        id: integration.id,
        name: integration.name,
        status: integration.status,
        syncStatus: integration.syncStatus,
        organizationId: integration.organizationId
      },
      organizations: user.organizations.map(membership => ({
        id: membership.organization.id,
        name: membership.organization.name,
        role: membership.role,
        integrationCount: membership.organization.integrations.length
      }))
    })

  } catch (error) {
    console.error('❌ Debug check integration error:', error)
    return NextResponse.json({
      status: 'error',
      message: 'Database query failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}