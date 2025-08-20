import { prisma, withWebhookDb } from '@/lib/prisma'
import { ShopifyService } from './shopify-service'
import { processTaxData } from '@/lib/utils/tax-processor'

interface ImportProgress {
  integrationId: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  totalOrders: number
  processedOrders: number
  startDate: Date
  endDate: Date
  error?: string
}

export class HistoricalImportService {
  private static importProgress: Map<string, ImportProgress> = new Map()

  /**
   * Import historical orders for a Shopify integration
   * Supports both months back (legacy) and options object (new)
   */
  static async importHistoricalOrders(
    integrationId: string, 
    optionsOrMonths: number | { daysBack?: number; batchSize?: number; maxOrders?: number } = 12
  ): Promise<ImportProgress> {
    // Parse options
    const options = typeof optionsOrMonths === 'number' 
      ? { daysBack: optionsOrMonths * 30, batchSize: 50, maxOrders: 1000 }
      : { daysBack: 90, batchSize: 50, maxOrders: 1000, ...optionsOrMonths }

    console.log(`🕒 Starting historical import for integration ${integrationId}`, options)

    // Create progress tracker
    const progress: ImportProgress = {
      integrationId,
      status: 'pending',
      totalOrders: 0,
      processedOrders: 0,
      startDate: new Date(),
      endDate: new Date(),
      error: undefined
    }

    this.importProgress.set(integrationId, progress)

    try {
      // Get integration details
      const integration = await withWebhookDb(async (db) => {
        return await db.integration.findUnique({
          where: { id: integrationId },
          include: { organization: true }
        })
      })

      if (!integration || integration.type !== 'SHOPIFY') {
        throw new Error('Invalid Shopify integration')
      }

      const credentials = integration.credentials as any
      const shop = credentials.shop
      const accessToken = credentials.accessToken

      // Calculate date range 
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - options.daysBack)

      progress.startDate = startDate
      progress.endDate = endDate
      progress.status = 'in_progress'

      console.log(`📅 Importing orders from ${startDate.toISOString()} to ${endDate.toISOString()}`)

      // Fetch orders from Shopify with maxOrders limit
      const orders = await this.fetchAllOrders(shop, accessToken, startDate, endDate, options.maxOrders)
      progress.totalOrders = orders.length

      console.log(`📦 Found ${orders.length} historical orders to import (max: ${options.maxOrders})`)

      // Process orders in batches with configurable batch size
      for (let i = 0; i < orders.length; i += options.batchSize) {
        const batch = orders.slice(i, i + options.batchSize)
        await this.processBatch(batch, integration, progress)
        
        // Rate limiting - small delay between batches
        if (i + options.batchSize < orders.length) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }

      progress.status = 'completed'
      console.log(`✅ Historical import completed: ${progress.processedOrders}/${progress.totalOrders} orders`)

      // Update integration with last sync time
      await withWebhookDb(async (db) => {
        await db.integration.update({
          where: { id: integrationId },
          data: {
            lastSyncAt: new Date(),
            syncStatus: 'SUCCESS',
            config: {
              ...integration.config as any,
              historicalImportCompleted: true,
              historicalImportDate: new Date().toISOString(),
              totalImported: progress.processedOrders,
              historicalImportRange: {
                start: startDate.toISOString(),
                end: endDate.toISOString(),
                daysBack: options.daysBack
              }
            }
          }
        })
      })

      return progress

    } catch (error) {
      console.error('❌ Historical import failed:', error)
      progress.status = 'failed'
      progress.error = error instanceof Error ? error.message : 'Unknown error'
      
      // Update integration with error
      await withWebhookDb(async (db) => {
        await db.integration.update({
          where: { id: integrationId },
          data: {
            syncStatus: 'ERROR',
            syncError: `Historical import failed: ${progress.error}`
          }
        })
      })

      throw error
    }
  }

  /**
   * Fetch all orders from Shopify within date range
   */
  private static async fetchAllOrders(
    shop: string,
    accessToken: string,
    startDate: Date,
    endDate: Date,
    maxOrders: number = 1000
  ): Promise<any[]> {
    const allOrders: any[] = []
    let pageInfo: string | null = null
    const limit = 250 // Max allowed by Shopify

    do {
      const params = new URLSearchParams({
        limit: limit.toString(),
        status: 'any',
        financial_status: 'paid', // Only import paid orders
        created_at_min: startDate.toISOString(),
        created_at_max: endDate.toISOString(),
        fields: 'id,name,created_at,updated_at,total_price,subtotal_price,total_tax,currency,customer,line_items,shipping_lines,tax_lines,billing_address,shipping_address,financial_status,fulfillment_status,cancel_reason,cancelled_at,refunds'
      })

      if (pageInfo) {
        params.append('page_info', pageInfo)
      }

      const url = `https://${shop}/admin/api/2024-01/orders.json?${params}`
      const response = await fetch(url, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to fetch orders: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      const orders = data.orders || []
      allOrders.push(...orders)

      // Stop if we've reached maxOrders limit
      if (allOrders.length >= maxOrders) {
        console.log(`📋 Reached maxOrders limit of ${maxOrders}, stopping fetch`)
        break
      }

      // Check for pagination
      const linkHeader = response.headers.get('Link')
      pageInfo = this.extractPageInfo(linkHeader, 'next')

    } while (pageInfo)

    // Trim to maxOrders if we went over
    return allOrders.slice(0, maxOrders)
  }

  /**
   * Extract page info from Link header
   */
  private static extractPageInfo(linkHeader: string | null, rel: string): string | null {
    if (!linkHeader) return null

    const links = linkHeader.split(',')
    for (const link of links) {
      const match = link.match(/<[^>]+>; rel="([^"]+)"/)
      if (match && match[1] === rel) {
        const urlMatch = link.match(/page_info=([^>&]+)/)
        return urlMatch ? urlMatch[1] : null
      }
    }
    return null
  }

  /**
   * Process a batch of orders
   */
  private static async processBatch(
    orders: any[],
    integration: any,
    progress: ImportProgress
  ): Promise<void> {
    for (const order of orders) {
      try {
        // Skip if order already exists
        const existingTransaction = await withWebhookDb(async (db) => {
          return await db.transaction.findUnique({
            where: {
              organizationId_integrationId_externalId: {
                organizationId: integration.organizationId,
                integrationId: integration.id,
                externalId: order.id.toString()
              }
            }
          })
        })

        if (existingTransaction) {
          console.log(`⏭️ Order ${order.name} already exists, skipping`)
          progress.processedOrders++
          continue
        }

        // Process tax data
        const taxData = processTaxData(order)

        // Create transaction
        await withWebhookDb(async (db) => {
          await db.transaction.create({
            data: {
              organizationId: integration.organizationId,
              integrationId: integration.id,
              externalId: order.id.toString(),
              orderNumber: order.name,
              type: 'SALE',
              status: order.financial_status === 'paid' ? 'COMPLETED' : 'PENDING',
              currency: order.currency,
              subtotal: Math.round((parseFloat(order.subtotal_price) || 0) * 100),
              taxAmount: Math.round((parseFloat(order.total_tax) || 0) * 100),
              totalAmount: Math.round((parseFloat(order.total_price) || 0) * 100),
              
              // Enhanced tax fields
              gstAmount: Math.round((taxData.gst || 0) * 100),
              pstAmount: Math.round((taxData.pst || 0) * 100),
              hstAmount: Math.round((taxData.hst || 0) * 100),
              qstAmount: Math.round((taxData.qst || 0) * 100),
              stateTaxAmount: Math.round((taxData.stateTax || 0) * 100),
              localTaxAmount: Math.round((taxData.localTax || 0) * 100),
              otherTaxAmount: Math.round((taxData.other || 0) * 100),
              
              taxBreakdown: taxData.breakdown,
              taxCountry: taxData.jurisdiction.country,
              taxProvince: taxData.jurisdiction.province,
              taxCity: taxData.jurisdiction.city,
              taxPostalCode: taxData.jurisdiction.postalCode,
              
              customerEmail: order.customer?.email,
              customerName: `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim(),
              billingAddress: order.billing_address,
              shippingAddress: order.shipping_address,
              items: order.line_items,
              transactionDate: new Date(order.created_at),
              metadata: {
                importedAt: new Date().toISOString(),
                importType: 'historical',
                source: 'bulk_import'
              }
            }
          })
        })

        console.log(`✅ Imported order ${order.name}`)
        progress.processedOrders++

      } catch (error) {
        console.error(`❌ Failed to import order ${order.name}:`, error)
        // Continue with next order, don't fail entire batch
      }
    }

    // Update progress
    this.importProgress.set(progress.integrationId, progress)
  }

  /**
   * Get import progress for an integration
   */
  static getImportProgress(integrationId: string): ImportProgress | undefined {
    return this.importProgress.get(integrationId)
  }

  /**
   * Get import status from integration config and current progress
   * This provides a unified view of import status
   */
  static async getImportStatus(integrationId: string) {
    try {
      // Check in-memory progress first
      const activeProgress = this.getImportProgress(integrationId)
      if (activeProgress && activeProgress.status === 'in_progress') {
        return {
          status: activeProgress.status,
          progress: activeProgress.processedOrders,
          totalImported: activeProgress.processedOrders,
          startedAt: activeProgress.startDate.toISOString(),
          error: activeProgress.error
        }
      }

      // Check database for completed status
      const integration = await withWebhookDb(async (db) => {
        return await db.integration.findUnique({
          where: { id: integrationId },
          select: { config: true }
        })
      })

      const config = integration?.config as any
      if (config?.historicalImportCompleted) {
        return {
          status: 'completed' as const,
          completedAt: config.historicalImportDate,
          totalImported: config.totalImported || 0,
          startedAt: config.historicalImportRange?.start
        }
      }

      // Check if there was a failed import
      if (activeProgress && activeProgress.status === 'failed') {
        return {
          status: activeProgress.status,
          error: activeProgress.error,
          failedAt: new Date().toISOString(),
          progress: activeProgress.processedOrders
        }
      }

      return null // Not started
    } catch (error) {
      console.error('Error getting import status:', error)
      return null
    }
  }
}