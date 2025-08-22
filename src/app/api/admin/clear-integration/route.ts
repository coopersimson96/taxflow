import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { withWebhookDb } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🧹 Clearing invalid Shopify integrations for user:', session.user.email)

    // Find and delete invalid integrations
    const result = await withWebhookDb(async (db) => {
      // First, find integrations to log them
      const integrations = await db.integration.findMany({
        where: {
          type: 'SHOPIFY',
          organization: {
            members: {
              some: {
                user: { email: session.user.email! }
              }
            }
          }
        },
        select: {
          id: true,
          status: true,
          credentials: true,
          organization: {
            select: { name: true }
          }
        }
      })

      console.log(`Found ${integrations.length} Shopify integrations to clear`)
      
      // Log shop domains being cleared
      integrations.forEach(int => {
        const creds = int.credentials as any
        console.log(`- Clearing integration: ${creds?.shop || 'unknown shop'} (${int.status})`)
      })

      // Delete them
      const deleted = await db.integration.deleteMany({
        where: {
          type: 'SHOPIFY',
          organization: {
            members: {
              some: {
                user: { email: session.user.email! }
              }
            }
          }
        }
      })

      return {
        found: integrations,
        deleted: deleted.count
      }
    })

    return NextResponse.json({
      success: true,
      message: `Cleared ${result.deleted} Shopify integration(s)`,
      details: result.found.map(int => ({
        id: int.id,
        status: int.status,
        shop: (int.credentials as any)?.shop || 'unknown',
        organization: int.organization.name
      })),
      nextSteps: [
        '1. Update SHOPIFY_SCOPES in .env.local to include: read_shopify_payments',
        '2. Restart your development server',
        '3. Go to /integrations and reconnect your Shopify store',
        '4. Accept the new permissions when prompted'
      ]
    })

  } catch (error) {
    console.error('Clear integration error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to clear integrations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET method to check current integrations before clearing
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const integrations = await withWebhookDb(async (db) => {
      return await db.integration.findMany({
        where: {
          type: 'SHOPIFY',
          organization: {
            members: {
              some: {
                user: { email: session.user.email! }
              }
            }
          }
        },
        select: {
          id: true,
          status: true,
          createdAt: true,
          credentials: true,
          organization: {
            select: { name: true }
          }
        }
      })
    })

    return NextResponse.json({
      count: integrations.length,
      integrations: integrations.map(int => ({
        id: int.id,
        status: int.status,
        shop: (int.credentials as any)?.shop || 'unknown',
        scope: (int.credentials as any)?.scope || 'unknown',
        organization: int.organization.name,
        createdAt: int.createdAt
      }))
    })

  } catch (error) {
    console.error('Get integrations error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get integrations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}