import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/session-utils'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering for this route as it accesses session data
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [/api/user/stores] Starting request with unified session management...')
    
    // Use unified session management for consistency
    let session
    try {
      session = await requireAuth()
      console.log('✅ [/api/user/stores] Authentication successful for:', session.user.email)
    } catch (error) {
      console.log('❌ [/api/user/stores] Authentication failed:', error)
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

    if (!user) {
      console.log('❌ [/api/user/stores] User not found in database for email:', session.user.email)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    console.log('✅ [/api/user/stores] User found with', user.organizations.length, 'organizations')

    // Transform the data to a simpler format - only include orgs with connected integrations
    const stores = user.organizations
      .filter(org => org.organization.integrations.length > 0) // Only orgs with integrations
      .map(org => {
        const shopifyIntegration = org.organization.integrations[0]
        const credentials = shopifyIntegration?.credentials as any || {}
        
        return {
          id: shopifyIntegration.id, // Now we know this exists
          organizationId: org.organizationId,
          name: org.organization.name,
          shop: credentials.shop || 'Unknown',
          status: shopifyIntegration.status,
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