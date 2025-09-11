import crypto from 'crypto'
import { SHOPIFY_CONFIG } from '@/lib/config/constants'

export interface ShopifyTokens {
  accessToken: string
  scope: string
  shop: string
}

export interface ShopifyWebhookData {
  topic: string
  shop: string
  webhookId?: string
  address: string
}

export class ShopifyService {
  private static readonly API_VERSION = SHOPIFY_CONFIG.API_VERSION
  private static readonly REQUIRED_SCOPES = ['read_orders', 'read_products']

  /**
   * Generate the Shopify OAuth authorization URL
   */
  static generateAuthUrl(shop: string, state: string): string {
    const shopifyApiKey = process.env.SHOPIFY_API_KEY
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL
    const redirectUri = `${baseUrl}/api/shopify/callback`
    const scopes = process.env.SHOPIFY_SCOPES || this.REQUIRED_SCOPES.join(',')

    if (!shopifyApiKey) {
      throw new Error('SHOPIFY_API_KEY is not configured')
    }

    console.log('OAuth Configuration:', {
      shop,
      baseUrl,
      redirectUri,
      hasApiKey: !!shopifyApiKey,
      scopes
    })

    // Ensure shop domain doesn't include .myshopify.com for the OAuth URL
    const shopSubdomain = shop.replace('.myshopify.com', '')

    const params = new URLSearchParams({
      client_id: shopifyApiKey,
      scope: scopes,
      redirect_uri: redirectUri,
      state: state,
      'grant_options[]': 'per-user'
    })

    const authUrl = `https://${shopSubdomain}.myshopify.com/admin/oauth/authorize?${params.toString()}`
    console.log('Generated OAuth URL:', authUrl)
    
    return authUrl
  }

  /**
   * Exchange authorization code for access token
   */
  static async exchangeCodeForToken(shop: string, code: string): Promise<ShopifyTokens> {
    const shopifyApiKey = process.env.SHOPIFY_API_KEY
    const shopifyApiSecret = process.env.SHOPIFY_API_SECRET
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/shopify/callback`

    console.log('Token exchange parameters:', {
      shop,
      codeLength: code?.length,
      hasApiKey: !!shopifyApiKey,
      hasApiSecret: !!shopifyApiSecret,
      redirectUri
    })

    if (!shopifyApiKey || !shopifyApiSecret) {
      throw new Error('Shopify API credentials are not configured')
    }

    const tokenUrl = `https://${shop}.myshopify.com/admin/oauth/access_token`
    const requestBody = {
      client_id: shopifyApiKey,
      client_secret: shopifyApiSecret,
      code,
      redirect_uri: redirectUri,
    }

    console.log('Making token exchange request to:', tokenUrl)
    console.log('Request body keys:', Object.keys(requestBody))

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    console.log('Token exchange response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Token exchange error response:', errorText)
      throw new Error(`Failed to exchange code for token: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    console.log('Token exchange successful, received keys:', Object.keys(data))
    
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

    // Ensure both strings are the same length by padding with zeros if needed
    const normalizedCalculated = calculatedHmac.toLowerCase()
    const normalizedHeader = hmacHeader.toLowerCase()

    // Use timingSafeEqual with hex-encoded strings converted to buffers
    return crypto.timingSafeEqual(
      Buffer.from(normalizedCalculated, 'hex'),
      Buffer.from(normalizedHeader, 'hex')
    )
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

  /**
   * Make authenticated API request to Shopify
   */
  static async makeApiRequest(
    shop: string,
    accessToken: string,
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    const url = `https://${shop}.myshopify.com/admin/api/${this.API_VERSION}/${endpoint}`
    
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
    const baseUrl = process.env.NEXTAUTH_URL || 'https://taxflow-smoky.vercel.app'
    const webhookTopics = [
      'orders/create',
      'orders/updated',
      'orders/cancelled',
      'refunds/create',
      'app/uninstalled',
      // GDPR mandatory webhooks
      'customers/redact',
      'customers/data_request',
      'shop/redact'
    ]

    // Get existing webhooks
    const existingWebhooks = await this.listWebhooks(shop, accessToken)
    const existingWebhooksByTopic = new Map()
    
    // Index existing webhooks by topic
    for (const webhook of existingWebhooks.webhooks || []) {
      existingWebhooksByTopic.set(webhook.topic, webhook)
    }

    // Ensure all webhooks use the correct unified endpoint
    for (const topic of webhookTopics) {
      const correctAddress = `${baseUrl}/api/webhooks/shopify`
      const existingWebhook = existingWebhooksByTopic.get(topic)
      
      if (existingWebhook) {
        // Check if existing webhook has wrong URL
        if (existingWebhook.address !== correctAddress) {
          console.log(`🔄 Updating webhook for ${topic}: ${existingWebhook.address} -> ${correctAddress}`)
          try {
            // Delete old webhook
            await this.deleteWebhook(shop, accessToken, existingWebhook.id)
            console.log(`🗑️ Deleted old webhook for ${topic}`)
            
            // Create new webhook with correct URL
            await this.createWebhook(shop, accessToken, topic, correctAddress)
            console.log(`✅ Created updated webhook for ${topic}`)
          } catch (error) {
            console.error(`❌ Failed to update webhook for ${topic}:`, error)
          }
        } else {
          console.log(`ℹ️ Webhook for ${topic} already has correct URL`)
        }
      } else {
        // Create new webhook
        try {
          await this.createWebhook(shop, accessToken, topic, correctAddress)
          console.log(`✅ Created new webhook for ${topic}`)
        } catch (error) {
          console.error(`❌ Failed to create webhook for ${topic}:`, error)
        }
      }
    }
  }

  /**
   * Validate shop domain
   */
  static validateShopDomain(shop: string): boolean {
    // Extract just the subdomain for validation
    const subdomain = shop.replace(/\.myshopify\.com$/, '')
    const shopRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/
    return shopRegex.test(subdomain) && subdomain.length <= 60
  }

  /**
   * Extract shop domain from various formats and ensure it includes .myshopify.com
   */
  static normalizeShopDomain(input: string): string {
    // Remove protocol if present
    let shop = input.replace(/^https?:\/\//, '')
    
    // Remove trailing slashes or paths
    shop = shop.replace(/\/.*$/, '')
    
    // If it already has .myshopify.com, just return it lowercased
    if (shop.includes('.myshopify.com')) {
      return shop.toLowerCase()
    }
    
    // If it has any other domain, extract just the subdomain
    if (shop.includes('.')) {
      shop = shop.split('.')[0]
    }
    
    // Ensure it ends with .myshopify.com
    return `${shop}.myshopify.com`.toLowerCase()
  }
}