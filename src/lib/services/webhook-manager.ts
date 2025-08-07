import { prisma } from '@/lib/prisma'
import { ShopifyService } from './shopify-service'

export interface WebhookHealth {
  topic: string
  url: string
  status: 'healthy' | 'unhealthy' | 'missing'
  lastSuccess?: Date
  lastFailure?: Date
  consecutiveFailures: number
}

export interface IntegrationHealth {
  integrationId: string
  shop: string
  overallStatus: 'healthy' | 'degraded' | 'failed'
  webhooks: WebhookHealth[]
  lastSync: Date
  nextHealthCheck: Date
}

export class WebhookManager {
  private static readonly REQUIRED_WEBHOOKS = [
    'orders/create',
    'orders/updated',
    'orders/cancelled',
    'refunds/create',
    'app/uninstalled'
  ]

  private static readonly HEALTH_CHECK_INTERVAL = 24 * 60 * 60 * 1000 // 24 hours
  private static readonly MAX_CONSECUTIVE_FAILURES = 5
  private static readonly WEBHOOK_TIMEOUT = 30000 // 30 seconds

  /**
   * Comprehensive webhook health check and synchronization
   */
  static async ensureWebhookHealth(integrationId: string): Promise<IntegrationHealth> {
    console.log(`🏥 Starting webhook health check for integration: ${integrationId}`)
    
    // Get integration details
    const integration = await prisma.integration.findUnique({
      where: { id: integrationId },
      include: { organization: true }
    })

    if (!integration) {
      throw new Error(`Integration ${integrationId} not found`)
    }

    const credentials = integration.credentials as any
    const shop = credentials?.shop
    const accessToken = credentials?.accessToken

    if (!shop || !accessToken) {
      throw new Error(`Invalid credentials for integration ${integrationId}`)
    }

    console.log(`🔍 Checking webhooks for shop: ${shop}`)

    try {
      // Get current webhooks from Shopify
      const shopifyWebhooks = await ShopifyService.listWebhooks(shop, accessToken)
      const existingWebhooks = shopifyWebhooks.webhooks || []

      const webhookHealth = await this.analyzeWebhookHealth(existingWebhooks)
      const integrationHealth = await this.determineIntegrationHealth(integrationId, shop, webhookHealth)

      // Perform healing if needed
      if (integrationHealth.overallStatus !== 'healthy') {
        console.log(`🚑 Integration health is ${integrationHealth.overallStatus}, performing healing...`)
        await this.healWebhooks(shop, accessToken, webhookHealth)
        
        // Re-check after healing
        const updatedWebhooks = await ShopifyService.listWebhooks(shop, accessToken)
        integrationHealth.webhooks = await this.analyzeWebhookHealth(updatedWebhooks.webhooks || [])
        integrationHealth.overallStatus = this.calculateOverallHealth(integrationHealth.webhooks)
      }

      // Update integration health status
      await this.updateIntegrationHealth(integrationId, integrationHealth)

      console.log(`✅ Health check completed for ${shop}: ${integrationHealth.overallStatus}`)
      return integrationHealth

    } catch (error) {
      console.error(`❌ Health check failed for integration ${integrationId}:`, error)
      
      // Mark integration as failed
      await prisma.integration.update({
        where: { id: integrationId },
        data: {
          syncStatus: 'ERROR',
          syncError: `Webhook health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          updatedAt: new Date()
        }
      })

      throw error
    }
  }

  /**
   * Analyze webhook health status
   */
  private static async analyzeWebhookHealth(existingWebhooks: any[]): Promise<WebhookHealth[]> {
    const baseUrl = process.env.NEXTAUTH_URL || 'https://taxflow-smoky.vercel.app'
    const correctUrl = `${baseUrl}/api/webhooks/shopify`

    const webhookHealthMap = new Map<string, WebhookHealth>()

    // Check each required webhook
    for (const topic of this.REQUIRED_WEBHOOKS) {
      const existingWebhook = existingWebhooks.find(w => w.topic === topic)
      
      if (!existingWebhook) {
        webhookHealthMap.set(topic, {
          topic,
          url: 'missing',
          status: 'missing',
          consecutiveFailures: 0
        })
      } else {
        const isCorrectUrl = existingWebhook.address === correctUrl
        const status = isCorrectUrl ? 'healthy' : 'unhealthy'
        
        webhookHealthMap.set(topic, {
          topic,
          url: existingWebhook.address,
          status,
          consecutiveFailures: isCorrectUrl ? 0 : 1
        })
      }
    }

    return Array.from(webhookHealthMap.values())
  }

  /**
   * Determine overall integration health
   */
  private static async determineIntegrationHealth(
    integrationId: string, 
    shop: string, 
    webhooks: WebhookHealth[]
  ): Promise<IntegrationHealth> {
    const overallStatus = this.calculateOverallHealth(webhooks)
    
    return {
      integrationId,
      shop,
      overallStatus,
      webhooks,
      lastSync: new Date(),
      nextHealthCheck: new Date(Date.now() + this.HEALTH_CHECK_INTERVAL)
    }
  }

  /**
   * Calculate overall health status
   */
  private static calculateOverallHealth(webhooks: WebhookHealth[]): 'healthy' | 'degraded' | 'failed' {
    const healthyCount = webhooks.filter(w => w.status === 'healthy').length
    const totalCount = webhooks.length

    if (healthyCount === totalCount) return 'healthy'
    if (healthyCount >= totalCount * 0.6) return 'degraded'
    return 'failed'
  }

  /**
   * Heal unhealthy webhooks
   */
  private static async healWebhooks(shop: string, accessToken: string, webhookHealth: WebhookHealth[]): Promise<void> {
    const baseUrl = process.env.NEXTAUTH_URL || 'https://taxflow-smoky.vercel.app'
    const correctUrl = `${baseUrl}/api/webhooks/shopify`

    console.log(`🔧 Starting webhook healing for ${shop}`)

    // Get current webhooks for deletion
    const shopifyWebhooks = await ShopifyService.listWebhooks(shop, accessToken)
    const existingWebhooks = shopifyWebhooks.webhooks || []

    // Delete all unhealthy or incorrect webhooks
    for (const webhook of existingWebhooks) {
      const health = webhookHealth.find(w => w.topic === webhook.topic)
      
      if (!health || health.status !== 'healthy') {
        try {
          await ShopifyService.deleteWebhook(shop, accessToken, webhook.id)
          console.log(`🗑️ Deleted unhealthy webhook: ${webhook.topic}`)
        } catch (deleteError) {
          console.error(`❌ Failed to delete webhook ${webhook.topic}:`, deleteError)
        }
      }
    }

    // Create missing or replacement webhooks
    const healingResults = []
    
    for (const topic of this.REQUIRED_WEBHOOKS) {
      const health = webhookHealth.find(w => w.topic === topic)
      
      if (!health || health.status !== 'healthy') {
        try {
          const result = await ShopifyService.createWebhook(shop, accessToken, topic, correctUrl)
          healingResults.push({
            topic,
            status: 'created',
            id: result.webhook.id,
            url: correctUrl
          })
          console.log(`✅ Created/healed webhook: ${topic} -> ${correctUrl}`)
        } catch (createError) {
          console.error(`❌ Failed to create webhook ${topic}:`, createError)
          healingResults.push({
            topic,
            status: 'failed',
            error: createError instanceof Error ? createError.message : 'Unknown error'
          })
        }
      }
    }

    console.log(`🏥 Healing completed. Results:`, healingResults)
  }

  /**
   * Update integration health in database
   */
  private static async updateIntegrationHealth(integrationId: string, health: IntegrationHealth): Promise<void> {
    const syncStatus = health.overallStatus === 'healthy' ? 'SUCCESS' : 
                      health.overallStatus === 'degraded' ? 'SUCCESS' : 'ERROR'

    const syncError = health.overallStatus === 'failed' ? 
      `Webhook health check failed: ${health.webhooks.filter(w => w.status !== 'healthy').length} unhealthy webhooks` :
      null

    await prisma.integration.update({
      where: { id: integrationId },
      data: {
        syncStatus,
        syncError,
        lastSyncAt: health.lastSync,
        metadata: {
          ...((await prisma.integration.findUnique({ where: { id: integrationId } })) as any)?.metadata || {},
          webhookHealth: {
            overallStatus: health.overallStatus,
            lastHealthCheck: health.lastSync.toISOString(),
            nextHealthCheck: health.nextHealthCheck.toISOString(),
            webhooks: health.webhooks
          }
        },
        updatedAt: new Date()
      } as any
    })
  }

  /**
   * Run health checks for all active integrations
   */
  static async runGlobalHealthCheck(): Promise<IntegrationHealth[]> {
    console.log('🌐 Starting global webhook health check...')
    
    const activeIntegrations = await prisma.integration.findMany({
      where: {
        type: 'SHOPIFY',
        status: 'CONNECTED'
      }
    })

    console.log(`Found ${activeIntegrations.length} active Shopify integrations`)

    const healthResults = []

    for (const integration of activeIntegrations) {
      try {
        const health = await this.ensureWebhookHealth(integration.id)
        healthResults.push(health)
      } catch (error) {
        console.error(`Failed health check for integration ${integration.id}:`, error)
        // Continue with other integrations
      }
    }

    console.log('🌐 Global health check completed')
    return healthResults
  }

  /**
   * Initialize webhooks for a new integration
   */
  static async initializeWebhooks(integrationId: string): Promise<IntegrationHealth> {
    console.log(`🚀 Initializing webhooks for new integration: ${integrationId}`)
    return await this.ensureWebhookHealth(integrationId)
  }
}