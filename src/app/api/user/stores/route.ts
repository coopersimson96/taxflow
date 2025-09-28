import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [/api/user/stores] Starting request...')
    
    // Add detailed session debugging
    const session = await getServerSession(authOptions)
    console.log('🔍 [/api/user/stores] Session check:', {
      sessionExists: !!session,
      userExists: !!session?.user,
      email: session?.user?.email,
      userId: session?.user?.id,
      sessionId: session?.user?.id || 'no-session-id'
    })
    
    if (!session?.user?.email) {
      console.log('❌ [/api/user/stores] No session or email found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    console.log('✅ [/api/user/stores] Valid session found for:', session.user.email)

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
      console.log('❌ [/api/user/stores] User not found in database for email:', session.user.email)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    console.log('✅ [/api/user/stores] User found with', user.organizations.length, 'organizations')

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

    console.log('✅ [/api/user/stores] Returning', stores.length, 'stores for user')
    
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