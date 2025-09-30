/**
 * Shopify GraphQL Admin API Service
 * 
 * Uses GraphQL API to avoid protected customer data restrictions
 * while still accessing all necessary order and tax information.
 */

interface GraphQLQuery {
  query: string;
  variables?: Record<string, any>;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    extensions?: any;
  }>;
}

export class ShopifyGraphQLService {
  /**
   * Execute a GraphQL query against Shopify Admin API
   */
  static async executeQuery<T>(
    shop: string,
    accessToken: string,
    query: GraphQLQuery
  ): Promise<T> {
    const shopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`
    const url = `https://${shopDomain}/admin/api/2024-01/graphql.json`

    console.log('🔗 GraphQL Query:', query.query.substring(0, 200) + '...')
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(query)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ GraphQL API error:', {
        status: response.status,
        statusText: response.statusText,
        errorText
      })
      throw new Error(`GraphQL request failed: ${response.status} - ${errorText}`)
    }

    const result: GraphQLResponse<T> = await response.json()

    if (result.errors && result.errors.length > 0) {
      console.error('❌ GraphQL errors:', result.errors)
      throw new Error(`GraphQL errors: ${result.errors.map(e => e.message).join(', ')}`)
    }

    if (!result.data) {
      throw new Error('No data returned from GraphQL query')
    }

    return result.data
  }

  /**
   * Fetch orders using GraphQL with pagination
   * This avoids protected customer data restrictions
   */
  static async fetchOrders(
    shop: string,
    accessToken: string,
    startDate: Date,
    endDate: Date,
    limit: number = 50,
    cursor?: string
  ): Promise<{
    orders: any[];
    pageInfo: {
      hasNextPage: boolean;
      endCursor?: string;
    };
  }> {
    const query = {
      query: `
        query GetOrders($first: Int!, $after: String, $query: String!) {
          orders(first: $first, after: $after, query: $query) {
            edges {
              node {
                id
                legacyResourceId
                name
                createdAt
                updatedAt
                totalPriceSet {
                  shopMoney {
                    amount
                    currencyCode
                  }
                }
                subtotalPriceSet {
                  shopMoney {
                    amount
                    currencyCode
                  }
                }
                totalTaxSet {
                  shopMoney {
                    amount
                    currencyCode
                  }
                }
                currencyCode
                financialStatus
                fulfillmentStatus
                cancelReason
                cancelledAt
                lineItems(first: 50) {
                  edges {
                    node {
                      id
                      title
                      quantity
                      variantTitle
                      originalUnitPriceSet {
                        shopMoney {
                          amount
                          currencyCode
                        }
                      }
                      originalTotalSet {
                        shopMoney {
                          amount
                          currencyCode
                        }
                      }
                      taxLines {
                        title
                        rate
                        priceSet {
                          shopMoney {
                            amount
                            currencyCode
                          }
                        }
                      }
                      product {
                        id
                        title
                      }
                    }
                  }
                }
                shippingLines(first: 10) {
                  edges {
                    node {
                      title
                      originalPriceSet {
                        shopMoney {
                          amount
                          currencyCode
                        }
                      }
                      taxLines {
                        title
                        rate
                        priceSet {
                          shopMoney {
                            amount
                            currencyCode
                          }
                        }
                      }
                    }
                  }
                }
                taxLines {
                  title
                  rate
                  priceSet {
                    shopMoney {
                      amount
                      currencyCode
                    }
                  }
                }
                billingAddress {
                  city
                  province
                  provinceCode
                  country
                  countryCodeV2
                  zip
                }
                shippingAddress {
                  city
                  province
                  provinceCode
                  country
                  countryCodeV2
                  zip
                }
                refunds {
                  id
                  createdAt
                  totalRefundedSet {
                    shopMoney {
                      amount
                      currencyCode
                    }
                  }
                  refundLineItems(first: 50) {
                    edges {
                      node {
                        quantity
                        lineItem {
                          id
                        }
                        totalTaxSet {
                          shopMoney {
                            amount
                            currencyCode
                          }
                        }
                      }
                    }
                  }
                }
              }
              cursor
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `,
      variables: {
        first: limit,
        after: cursor,
        query: `created_at:>='${startDate.toISOString()}' AND created_at:<='${endDate.toISOString()}' AND financial_status:paid`
      }
    }

    const result = await this.executeQuery<{
      orders: {
        edges: Array<{
          node: any;
          cursor: string;
        }>;
        pageInfo: {
          hasNextPage: boolean;
          endCursor?: string;
        };
      };
    }>(shop, accessToken, query)

    return {
      orders: result.orders.edges.map(edge => edge.node),
      pageInfo: result.orders.pageInfo
    }
  }

  /**
   * Transform GraphQL order to REST-like format for compatibility
   */
  static transformGraphQLOrder(graphqlOrder: any): any {
    return {
      id: parseInt(graphqlOrder.legacyResourceId),
      name: graphqlOrder.name,
      created_at: graphqlOrder.createdAt,
      updated_at: graphqlOrder.updatedAt,
      total_price: graphqlOrder.totalPriceSet?.shopMoney?.amount || '0',
      subtotal_price: graphqlOrder.subtotalPriceSet?.shopMoney?.amount || '0',
      total_tax: graphqlOrder.totalTaxSet?.shopMoney?.amount || '0',
      currency: graphqlOrder.currencyCode,
      financial_status: graphqlOrder.financialStatus?.toLowerCase(),
      fulfillment_status: graphqlOrder.fulfillmentStatus?.toLowerCase(),
      cancel_reason: graphqlOrder.cancelReason,
      cancelled_at: graphqlOrder.cancelledAt,
      
      // Transform line items
      line_items: graphqlOrder.lineItems?.edges?.map((edge: any) => ({
        id: parseInt(edge.node.id.split('/').pop()),
        title: edge.node.title,
        quantity: edge.node.quantity,
        variant_title: edge.node.variantTitle,
        price: edge.node.originalUnitPriceSet?.shopMoney?.amount || '0',
        total_price: edge.node.originalTotalSet?.shopMoney?.amount || '0',
        tax_lines: edge.node.taxLines?.map((taxLine: any) => ({
          title: taxLine.title,
          rate: taxLine.rate,
          price: taxLine.priceSet?.shopMoney?.amount || '0'
        })) || [],
        product_id: edge.node.product?.id ? parseInt(edge.node.product.id.split('/').pop()) : null,
        product_title: edge.node.product?.title
      })) || [],

      // Transform shipping lines
      shipping_lines: graphqlOrder.shippingLines?.edges?.map((edge: any) => ({
        title: edge.node.title,
        price: edge.node.originalPriceSet?.shopMoney?.amount || '0',
        tax_lines: edge.node.taxLines?.map((taxLine: any) => ({
          title: taxLine.title,
          rate: taxLine.rate,
          price: taxLine.priceSet?.shopMoney?.amount || '0'
        })) || []
      })) || [],

      // Transform tax lines
      tax_lines: graphqlOrder.taxLines?.map((taxLine: any) => ({
        title: taxLine.title,
        rate: taxLine.rate,
        price: taxLine.priceSet?.shopMoney?.amount || '0'
      })) || [],

      // Transform addresses (no customer PII, just location data)
      billing_address: graphqlOrder.billingAddress ? {
        city: graphqlOrder.billingAddress.city,
        province: graphqlOrder.billingAddress.province,
        province_code: graphqlOrder.billingAddress.provinceCode,
        country: graphqlOrder.billingAddress.country,
        country_code: graphqlOrder.billingAddress.countryCodeV2,
        zip: graphqlOrder.billingAddress.zip
      } : null,

      shipping_address: graphqlOrder.shippingAddress ? {
        city: graphqlOrder.shippingAddress.city,
        province: graphqlOrder.shippingAddress.province,
        province_code: graphqlOrder.shippingAddress.provinceCode,
        country: graphqlOrder.shippingAddress.country,
        country_code: graphqlOrder.shippingAddress.countryCodeV2,
        zip: graphqlOrder.shippingAddress.zip
      } : null,

      // Transform refunds
      refunds: graphqlOrder.refunds?.map((refund: any) => ({
        id: parseInt(refund.id.split('/').pop()),
        created_at: refund.createdAt,
        total_refunded: refund.totalRefundedSet?.shopMoney?.amount || '0',
        refund_line_items: refund.refundLineItems?.edges?.map((edge: any) => ({
          quantity: edge.node.quantity,
          line_item_id: edge.node.lineItem?.id ? parseInt(edge.node.lineItem.id.split('/').pop()) : null,
          total_tax: edge.node.totalTaxSet?.shopMoney?.amount || '0'
        })) || []
      })) || []
    }
  }
}