import { withWebhookDb } from '@/lib/prisma'
import { ShopifyService } from './shopify-service'

export class HistoricalImportService {
  /**
   * Import historical orders for a new integration
   * Automatically triggered when Shopify store is connected
   */
  static async importHistoricalOrders(integrationId: string, options: {
    daysBack?: number
    batchSize?: number
    maxOrders?: number
  } = {}) {
    const { daysBack = 90, batchSize = 50, maxOrders = 1000 } = options

    try {
      console.log(`🔄 Starting historical import for integration: ${integrationId}`)
      
      // Get integration details
      const integration = await withWebhookDb(async (db) => {
        return await db.integration.findUnique({
          where: { id: integrationId },
          include: { organization: true }
        })
      })

      if (!integration || integration.type !== 'SHOPIFY') {
        throw new Error('Integration not found or not Shopify type')
      }

      const credentials = integration.credentials as any
      if (!credentials?.accessToken || !credentials?.shop) {
        throw new Error('Invalid integration credentials')
      }

      // Calculate date range
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - daysBack)

      console.log(`📅 Importing orders from ${startDate.toISOString()} to ${endDate.toISOString()}`)

      // Start import job
      await this.markImportInProgress(integrationId)

      let totalImported = 0
      let hasMore = true
      let sinceId: string | null = null

      while (hasMore && totalImported < maxOrders) {
        console.log(`📦 Fetching batch ${Math.floor(totalImported / batchSize) + 1}...`)

        // Fetch orders from Shopify
        const ordersResponse = await this.fetchOrdersBatch(
          credentials.accessToken,
          credentials.shop,
          {
            limit: Math.min(batchSize, maxOrders - totalImported),
            sinceId,
            createdAtMin: startDate.toISOString(),
            createdAtMax: endDate.toISOString()
          }
        )

        if (!ordersResponse.orders || ordersResponse.orders.length === 0) {
          console.log('✅ No more orders to import')
          hasMore = false
          break
        }

        // Process and save orders
        const processedCount = await this.processOrdersBatch(
          ordersResponse.orders,
          integration.organizationId,
          integrationId
        )

        totalImported += processedCount
        sinceId = ordersResponse.orders[ordersResponse.orders.length - 1]?.id || null

        // Update progress
        await this.updateImportProgress(integrationId, totalImported, false)

        console.log(`✅ Imported batch: ${processedCount} orders (Total: ${totalImported})`)

        // Rate limiting - wait between batches
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      // Mark import complete
      await this.markImportComplete(integrationId, totalImported)
      
      console.log(`🎉 Historical import completed! Total orders: ${totalImported}`)
      
      return {
        success: true,
        totalImported,
        dateRange: { startDate, endDate }
      }

    } catch (error) {
      console.error('❌ Historical import failed:', error)
      await this.markImportFailed(integrationId, error instanceof Error ? error.message : 'Unknown error')
      throw error
    }
  }

  /**
   * Fetch a batch of orders from Shopify API
   */
  private static async fetchOrdersBatch(
    accessToken: string,
    shop: string,
    params: {
      limit: number
      sinceId?: string | null
      createdAtMin: string
      createdAtMax: string
    }
  ) {
    const { limit, sinceId, createdAtMin, createdAtMax } = params
    
    const queryParams = new URLSearchParams({
      limit: limit.toString(),
      status: 'any',
      financial_status: 'paid',
      created_at_min: createdAtMin,
      created_at_max: createdAtMax
    })

    if (sinceId) {
      queryParams.set('since_id', sinceId)
    }

    const url = `https://${shop}/admin/api/2024-01/orders.json?${queryParams}`
    
    const response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  }

  /**
   * Process and save a batch of orders to database
   */
  private static async processOrdersBatch(
    orders: any[],
    organizationId: string,
    integrationId: string
  ) {
    let processedCount = 0

    for (const order of orders) {
      try {
        // Skip if order already exists
        const existingTransaction = await withWebhookDb(async (db) => {
          return await db.transaction.findFirst({
            where: {
              externalId: order.id.toString(),
              organizationId
            }
          })
        })

        if (existingTransaction) {
          console.log(`⏭️  Skipping existing order: ${order.order_number}`)
          continue
        }

        // Calculate tax amounts
        const taxBreakdown = this.calculateTaxBreakdown(order)
        
        // Create transaction record
        await withWebhookDb(async (db) => {
          return await db.transaction.create({
            data: {
              organizationId,
              integrationId,
              externalId: order.id.toString(),
              orderNumber: order.order_number?.toString(),
              transactionDate: new Date(order.created_at),
              totalAmount: Math.round(parseFloat(order.total_price) * 100),
              subtotal: Math.round(parseFloat(order.subtotal_price || order.total_price) * 100),
              taxAmount: Math.round(parseFloat(order.total_tax || '0') * 100),
              currency: order.currency || 'USD',
              status: 'COMPLETED',
              customerName: order.customer ? `${order.customer.first_name} ${order.customer.last_name}`.trim() : null,
              customerEmail: order.customer?.email,
              // Tax breakdown
              gstAmount: taxBreakdown.gst,
              pstAmount: taxBreakdown.pst,
              hstAmount: taxBreakdown.hst,
              qstAmount: taxBreakdown.qst,
              stateTaxAmount: taxBreakdown.stateTax,
              localTaxAmount: taxBreakdown.localTax,
              otherTaxAmount: taxBreakdown.other,
              // Location data
              taxCountry: order.billing_address?.country || order.shipping_address?.country,
              taxProvince: order.billing_address?.province || order.shipping_address?.province,
              taxCity: order.billing_address?.city || order.shipping_address?.city,
              taxPostalCode: order.billing_address?.zip || order.shipping_address?.zip,
              // Store line items
              items: order.line_items || []
            }
          })
        })

        processedCount++
        console.log(`✅ Imported order: ${order.order_number}`)

      } catch (error) {
        console.error(`❌ Failed to import order ${order.order_number}:`, error)
        // Continue with next order instead of failing entire batch
      }
    }

    return processedCount
  }

  /**
   * Calculate tax breakdown from Shopify order
   */
  private static calculateTaxBreakdown(order: any) {
    const totalTaxCents = Math.round(parseFloat(order.total_tax || '0') * 100)
    
    // Initialize breakdown
    const breakdown = {
      gst: 0, pst: 0, hst: 0, qst: 0, stateTax: 0, localTax: 0, other: 0
    }

    // If there are tax lines, try to categorize them
    if (order.tax_lines && order.tax_lines.length > 0) {
      for (const taxLine of order.tax_lines) {
        const taxAmount = Math.round(parseFloat(taxLine.price) * 100)
        const title = (taxLine.title || '').toLowerCase()

        if (title.includes('gst') || title.includes('goods and services')) {
          breakdown.gst += taxAmount
        } else if (title.includes('pst') || title.includes('provincial')) {
          breakdown.pst += taxAmount
        } else if (title.includes('hst') || title.includes('harmonized')) {
          breakdown.hst += taxAmount
        } else if (title.includes('qst') || title.includes('quebec')) {
          breakdown.qst += taxAmount
        } else if (title.includes('state') || title.includes('sales tax')) {
          breakdown.stateTax += taxAmount
        } else if (title.includes('local') || title.includes('city') || title.includes('county')) {
          breakdown.localTax += taxAmount
        } else {
          breakdown.other += taxAmount
        }
      }
    } else {
      // If no tax lines, put all tax in "other" category
      breakdown.other = totalTaxCents
    }

    return breakdown
  }

  /**
   * Import progress tracking methods
   */
  private static async markImportInProgress(integrationId: string) {
    await withWebhookDb(async (db) => {
      return await db.integration.update({
        where: { id: integrationId },
        data: {
          metadata: {
            ...((await db.integration.findUnique({ where: { id: integrationId } }))?.metadata as any || {}),
            historicalImport: {
              status: 'in_progress',
              startedAt: new Date().toISOString(),
              progress: 0
            }
          }
        }
      })
    })
  }

  private static async updateImportProgress(integrationId: string, imported: number, isComplete: boolean) {
    await withWebhookDb(async (db) => {
      const integration = await db.integration.findUnique({ where: { id: integrationId } })
      const currentMetadata = integration?.metadata as any || {}
      
      return await db.integration.update({
        where: { id: integrationId },
        data: {
          metadata: {
            ...currentMetadata,
            historicalImport: {
              ...currentMetadata.historicalImport,
              progress: imported,
              status: isComplete ? 'completed' : 'in_progress',
              lastUpdated: new Date().toISOString()
            }
          }
        }
      })
    })
  }

  private static async markImportComplete(integrationId: string, totalImported: number) {
    await withWebhookDb(async (db) => {
      const integration = await db.integration.findUnique({ where: { id: integrationId } })
      const currentMetadata = integration?.metadata as any || {}
      
      return await db.integration.update({
        where: { id: integrationId },
        data: {
          metadata: {
            ...currentMetadata,
            historicalImport: {
              status: 'completed',
              startedAt: currentMetadata.historicalImport?.startedAt,
              completedAt: new Date().toISOString(),
              totalImported,
              progress: totalImported
            }
          }
        }
      })
    })
  }

  private static async markImportFailed(integrationId: string, error: string) {
    await withWebhookDb(async (db) => {
      const integration = await db.integration.findUnique({ where: { id: integrationId } })
      const currentMetadata = integration?.metadata as any || {}
      
      return await db.integration.update({
        where: { id: integrationId },
        data: {
          metadata: {
            ...currentMetadata,
            historicalImport: {
              status: 'failed',
              startedAt: currentMetadata.historicalImport?.startedAt,
              failedAt: new Date().toISOString(),
              error,
              progress: currentMetadata.historicalImport?.progress || 0
            }
          }
        }
      })
    })
  }

  /**
   * Get import status for an integration
   */
  static async getImportStatus(integrationId: string) {
    const integration = await withWebhookDb(async (db) => {
      return await db.integration.findUnique({
        where: { id: integrationId },
        select: { metadata: true }
      })
    })

    const metadata = integration?.metadata as any
    return metadata?.historicalImport || null
  }
}