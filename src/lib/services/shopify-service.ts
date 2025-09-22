import crypto from 'crypto'
import { SHOPIFY_CONFIG } from '@/lib/config/constants'

export interface ShopifyTokens {
  accessToken: string
  scope: string
  shop: string
}

export class ShopifyService {
  private static readonly API_VERSION = SHOPIFY_CONFIG.API_VERSION
  private static readonly REQUIRED_SCOPES = ['read_orders', 'read_products']

  /**
   * Generate the Shopify OAuth authorization URL
   */
  static generateAuthUrl(shop: string, state: string): string {
    const shopifyApiKey = process.env.SHOPIFY_API_KEY
    const redirectUri = `https://taxflow-smoky.vercel.app/api/shopify/callback`
    const scopes = process.env.SHOPIFY_SCOPES || this.REQUIRED_SCOPES.join(',')

    if (!shopifyApiKey) {
      throw new Error('SHOPIFY_API_KEY is not configured')
    }

    const shopSubdomain = shop.replace('.myshopify.com', '')
    const params = new URLSearchParams({
      client_id: shopifyApiKey,
      scope: scopes,
      redirect_uri: redirectUri,
      state: state,
      'grant_options[]': 'per-user'
    })

    return `https://${shopSubdomain}.myshopify.com/admin/oauth/authorize?${params.toString()}`
  }

  /**
   * Exchange authorization code for access token
   */
  static async exchangeCodeForToken(shop: string, code: string): Promise<ShopifyTokens> {
    const shopifyApiKey = process.env.SHOPIFY_API_KEY
    const shopifyApiSecret = process.env.SHOPIFY_API_SECRET
    const redirectUri = `https://taxflow-smoky.vercel.app/api/shopify/callback`

    if (!shopifyApiKey || !shopifyApiSecret) {
      throw new Error('Shopify API credentials are not configured')
    }

    const shopDomain = shop.endsWith('.myshopify.com') ? shop : `${shop}.myshopify.com`
    const tokenUrl = `https://${shopDomain}/admin/oauth/access_token`
    
    console.log('Token exchange:', { shop: shopDomain, redirectUri, hasCode: !!code })

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: shopifyApiKey,
        client_secret: shopifyApiSecret,
        code,
        redirect_uri: redirectUri,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Token exchange failed:', response.status, errorText)
      throw new Error(`Token exchange failed: ${response.status}`)
    }

    const data = await response.json()
    return {
      accessToken: data.access_token,
      scope: data.scope,
      shop: shop,
    }
  }

  /**
   * Verify HMAC signature from Shopify
   */
  static verifyHmac(data: string, hmacHeader: string): boolean {
    const shopifyApiSecret = process.env.SHOPIFY_API_SECRET
    if (!shopifyApiSecret) {
      throw new Error('SHOPIFY_API_SECRET is not configured')
    }

    const calculatedHmac = crypto
      .createHmac('sha256', shopifyApiSecret)
      .update(data, 'utf8')
      .digest('hex')

    const normalizedCalculated = calculatedHmac.toLowerCase()
    const normalizedHeader = hmacHeader.toLowerCase()

    return crypto.timingSafeEqual(
      Buffer.from(normalizedCalculated, 'hex'),
      Buffer.from(normalizedHeader, 'hex')
    )
  }

  /**
   * Make authenticated API request to Shopify
   */
  static async makeApiRequest(
    shop: string,
    accessToken: string,
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    const url = `https://${shop}/admin/api/${this.API_VERSION}/${endpoint}`
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Shopify API request failed: ${response.status} ${errorText}`)
    }

    return response.json()
  }

  /**
   * Get shop information
   */
  static async getShopInfo(shop: string, accessToken: string): Promise<any> {
    return this.makeApiRequest(shop, accessToken, 'shop.json')
  }

  /**
   * Validate shop domain
   */
  static validateShopDomain(shop: string): boolean {
    const subdomain = shop.replace(/\.myshopify\.com$/, '')
    const shopRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/
    return shopRegex.test(subdomain) && subdomain.length <= 60
  }

  /**
   * Extract shop domain from various formats and ensure it includes .myshopify.com
   */
  static normalizeShopDomain(input: string): string {
    let shop = input.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
    
    if (shop.includes('.myshopify.com')) {
      return shop.toLowerCase()
    }
    
    if (shop.includes('.')) {
      shop = shop.split('.')[0]
    }
    
    return `${shop}.myshopify.com`.toLowerCase()
  }

  /**
   * Create a webhook subscription
   */
  static async createWebhook(
    shop: string,
    accessToken: string,
    topic: string,
    address: string
  ): Promise<any> {
    const webhook = {
      webhook: {
        topic,
        address,
        format: 'json'
      }
    }

    return this.makeApiRequest(shop, accessToken, 'webhooks.json', {
      method: 'POST',
      body: JSON.stringify(webhook)
    })
  }

  /**
   * List existing webhooks
   */
  static async listWebhooks(shop: string, accessToken: string): Promise<any> {
    return this.makeApiRequest(shop, accessToken, 'webhooks.json')
  }

  /**
   * Delete a webhook
   */
  static async deleteWebhook(shop: string, accessToken: string, webhookId: string): Promise<void> {
    await this.makeApiRequest(shop, accessToken, `webhooks/${webhookId}.json`, {
      method: 'DELETE'
    })
  }

  /**
   * Setup required webhooks for tax tracking
   */
  static async setupWebhooks(shop: string, accessToken: string): Promise<void> {
    const baseUrl = 'https://taxflow-smoky.vercel.app'
    const webhookTopics = [
      'orders/create',
      'orders/updated',
      'orders/cancelled',
      'refunds/create',
      'app/uninstalled',
      'customers/redact',
      'customers/data_request',
      'shop/redact'
    ]

    const existingWebhooks = await this.listWebhooks(shop, accessToken)
    const existingWebhooksByTopic = new Map()
    
    for (const webhook of existingWebhooks.webhooks || []) {
      existingWebhooksByTopic.set(webhook.topic, webhook)
    }

    for (const topic of webhookTopics) {
      const correctAddress = `${baseUrl}/api/webhooks/shopify`
      const existingWebhook = existingWebhooksByTopic.get(topic)
      
      if (existingWebhook) {
        if (existingWebhook.address !== correctAddress) {
          try {
            await this.deleteWebhook(shop, accessToken, existingWebhook.id)
            await this.createWebhook(shop, accessToken, topic, correctAddress)
          } catch (error) {
            console.error(`Failed to update webhook for ${topic}:`, error)
          }
        }
      } else {
        try {
          await this.createWebhook(shop, accessToken, topic, correctAddress)
        } catch (error) {
          console.error(`Failed to create webhook for ${topic}:`, error)
        }
      }
    }
  }

  /**
   * Verify webhook HMAC signature
   */
  static verifyWebhookHmac(rawBody: string, hmacHeader: string): boolean {
    const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET
    if (!webhookSecret) {
      throw new Error('SHOPIFY_WEBHOOK_SECRET is not configured')
    }

    const calculatedHmac = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody, 'utf8')
      .digest('base64')

    return crypto.timingSafeEqual(
      Buffer.from(calculatedHmac),
      Buffer.from(hmacHeader)
    )
  }
}