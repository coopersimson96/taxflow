import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ShopifyService } from '@/lib/services/shopify-service'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const integration = await prisma.integration.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        type: true,
        name: true,
        status: true,
        lastSyncAt: true,
        syncStatus: true,
        syncError: true,
        credentials: true,
        createdAt: true,
        updatedAt: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    })

    if (!integration) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      )
    }

    // Remove sensitive data
    const safeIntegration = {
      ...integration,
      credentials: integration.credentials ? {
        ...integration.credentials as any,
        accessToken: undefined
      } : null
    }

    return NextResponse.json({
      success: true,
      integration: safeIntegration
    })

  } catch (error) {
    console.error('Error fetching integration:', error)
    return NextResponse.json(
      { error: 'Failed to fetch integration' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Find the integration first
    const integration = await prisma.integration.findUnique({
      where: { id: params.id },
      include: {
        organization: true
      }
    })

    if (!integration) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      )
    }

    // If it's a Shopify integration, try to clean up webhooks
    if (integration.type === 'SHOPIFY' && integration.credentials) {
      try {
        const credentials = integration.credentials as any
        if (credentials.accessToken && credentials.shop) {
          // List and delete webhooks created by our app
          const webhooks = await ShopifyService.listWebhooks(
            credentials.shop,
            credentials.accessToken
          )

          const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
          const ourWebhooks = webhooks.webhooks?.filter((webhook: any) =>
            webhook.address?.startsWith(`${baseUrl}/api/shopify/webhooks/`)
          ) || []

          for (const webhook of ourWebhooks) {
            try {
              await ShopifyService.deleteWebhook(
                credentials.shop,
                credentials.accessToken,
                webhook.id
              )
              console.log(`✅ Deleted webhook ${webhook.id} for ${webhook.topic}`)
            } catch (webhookError) {
              console.error(`Failed to delete webhook ${webhook.id}:`, webhookError)
              // Continue with other webhooks even if one fails
            }
          }
        }
      } catch (cleanupError) {
        console.error('Webhook cleanup failed:', cleanupError)
        // Don't fail the entire deletion if webhook cleanup fails
      }
    }

    // Delete all related transactions first (cascade should handle this, but being explicit)
    await prisma.transaction.deleteMany({
      where: {
        integrationId: params.id
      }
    })

    // Delete the integration
    await prisma.integration.delete({
      where: { id: params.id }
    })

    console.log(`✅ Integration ${params.id} (${integration.name}) deleted successfully`)

    return NextResponse.json({
      success: true,
      message: 'Integration deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting integration:', error)
    return NextResponse.json(
      { error: 'Failed to delete integration' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, status, config } = body

    const integration = await prisma.integration.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(status && { status }),
        ...(config && { config }),
        updatedAt: new Date()
      },
      select: {
        id: true,
        type: true,
        name: true,
        status: true,
        syncStatus: true,
        updatedAt: true
      }
    })

    return NextResponse.json({
      success: true,
      integration
    })

  } catch (error) {
    console.error('Error updating integration:', error)
    return NextResponse.json(
      { error: 'Failed to update integration' },
      { status: 500 }
    )
  }
}