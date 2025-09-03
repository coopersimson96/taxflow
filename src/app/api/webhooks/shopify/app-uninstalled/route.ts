import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { withWebhookDb } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Verify Shopify webhook signature
function verifyWebhook(rawBody: string, signature: string): boolean {
  const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('Missing SHOPIFY_WEBHOOK_SECRET')
    return false
  }

  const hash = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody, 'utf8')
    .digest('base64')

  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature))
}

/**
 * Handle app uninstall webhook
 * Clean up data and cancel subscriptions when app is uninstalled
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature
    const rawBody = await request.text()
    const signature = request.headers.get('x-shopify-hmac-sha256') || ''
    
    if (!verifyWebhook(rawBody, signature)) {
      console.error('Invalid webhook signature')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = JSON.parse(rawBody)
    const shop = data.domain || data.myshopify_domain
    
    console.log(`🔴 App uninstalled for shop: ${shop}`)

    // Handle uninstall
    await handleAppUninstall(shop)

    // Return success immediately (process in background)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('App uninstall webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

async function handleAppUninstall(shop: string) {
  try {
    await withWebhookDb(async (db) => {
      // Find the integration for this shop
      const integration = await db.integration.findFirst({
        where: {
          type: 'SHOPIFY',
          credentials: {
            path: ['shop'],
            equals: shop
          }
        }
      })

      if (!integration) {
        console.log(`No integration found for shop: ${shop}`)
        return
      }

      // Log uninstall event
      console.log(`Processing uninstall for integration: ${integration.id}`)

      // 1. Cancel any active subscriptions
      // TODO: Implement when billing is added
      
      // 2. Remove webhook subscriptions from Shopify
      // (Shopify automatically removes them on uninstall)
      
      // 3. Mark integration as inactive (update config with uninstall info)
      const currentConfig = integration.config as any || {}
      await db.integration.update({
        where: { id: integration.id },
        data: {
          status: 'DISCONNECTED',
          config: {
            ...currentConfig,
            uninstalledAt: new Date().toISOString(),
            retentionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
          }
        }
      })

      console.log(`✅ App uninstall processed for shop: ${shop}`)
      
      // Schedule data deletion after grace period (30 days)
      // In production, use a job queue like BullMQ or SQS
      scheduleDataDeletion(integration.id, 30)
    })
  } catch (error) {
    console.error(`Failed to process uninstall for shop ${shop}:`, error)
    throw error
  }
}

/**
 * Schedule data deletion after grace period
 * In production, use a proper job queue
 */
function scheduleDataDeletion(integrationId: string, daysDelay: number) {
  // For now, just log the intent
  console.log(`📅 Scheduled data deletion for integration ${integrationId} in ${daysDelay} days`)
  
  // In production, you would:
  // 1. Use a job queue (BullMQ, AWS SQS, etc.)
  // 2. Schedule a job to run after the grace period
  // 3. The job would delete all data if the app wasn't reinstalled
  
  // Example with setTimeout (NOT for production):
  // setTimeout(async () => {
  //   await deleteIntegrationData(integrationId)
  // }, daysDelay * 24 * 60 * 60 * 1000)
}

/**
 * Delete all data for an integration
 * Called after grace period expires
 */
async function deleteIntegrationData(integrationId: string) {
  await withWebhookDb(async (db) => {
    // Check if app was reinstalled
    const integration = await db.integration.findUnique({
      where: { id: integrationId }
    })

    if (!integration || integration.status === 'CONNECTED') {
      console.log(`Integration ${integrationId} is connected or not found, skipping deletion`)
      return
    }

    const uninstalledAt = (integration.config as any)?.uninstalledAt
    if (!uninstalledAt) return

    const daysSinceUninstall = (Date.now() - new Date(uninstalledAt).getTime()) / (1000 * 60 * 60 * 24)
    
    if (daysSinceUninstall < 30) {
      console.log(`Grace period not expired for integration ${integrationId}`)
      return
    }

    // Delete in correct order to respect foreign keys
    console.log(`🗑️ Deleting all data for integration ${integrationId}`)

    // 1. Delete transactions
    const deletedTransactions = await db.transaction.deleteMany({
      where: { integrationId }
    })

    // 2. Delete the integration
    await db.integration.delete({
      where: { id: integrationId }
    })

    console.log(`✅ Deleted ${deletedTransactions.count} transactions and integration ${integrationId}`)
  })
}