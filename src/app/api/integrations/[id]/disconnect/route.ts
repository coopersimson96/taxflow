import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { withWebhookDb } from '@/lib/prisma'
import { ShopifyService } from '@/lib/services/shopify-service'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const integrationId = params.id

    // Get the integration and verify ownership
    const integration = await withWebhookDb(async (db) => {
      return await db.integration.findUnique({
        where: { id: integrationId },
        include: { 
          organization: {
            include: {
              userOrganizations: {
                where: { 
                  user: { email: session.user!.email! }
                }
              }
            }
          }
        }
      })
    })

    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    // Check if user has access to this integration
    const hasAccess = integration.organization.userOrganizations.length > 0
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // If it's a Shopify integration, clean up webhooks
    if (integration.type === 'SHOPIFY') {
      try {
        const credentials = integration.credentials as any
        if (credentials?.accessToken && credentials?.shop) {
          // Remove webhooks from Shopify
          const webhooks = await ShopifyService.listWebhooks(credentials.shop, credentials.accessToken)
          
          for (const webhook of webhooks.webhooks || []) {
            try {
              await ShopifyService.deleteWebhook(credentials.shop, credentials.accessToken, webhook.id)
              console.log(`🗑️ Deleted webhook ${webhook.id} for topic ${webhook.topic}`)
            } catch (error) {
              console.error(`Failed to delete webhook ${webhook.id}:`, error)
              // Continue with disconnection even if webhook deletion fails
            }
          }
        }
      } catch (error) {
        console.error('Failed to clean up Shopify webhooks:', error)
        // Continue with disconnection even if webhook cleanup fails
      }
    }

    // Delete all related data in a transaction
    await withWebhookDb(async (db) => {
      // Delete transactions first (they reference the integration)
      await db.transaction.deleteMany({
        where: { integrationId: integrationId }
      })

      // Delete the integration
      await db.integration.delete({
        where: { id: integrationId }
      })
    })

    console.log(`✅ Successfully disconnected integration ${integrationId}`)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error disconnecting integration:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect integration' },
      { status: 500 }
    )
  }
}