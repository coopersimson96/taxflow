// Shopify API Types
export interface ShopifyOrder {
  id: string
  order_number: number
  created_at: string
  updated_at: string
  total_price: string
  subtotal_price: string
  total_tax: string
  currency: string
  financial_status: string
  fulfillment_status: string | null
  customer: ShopifyCustomer
  billing_address: ShopifyAddress
  shipping_address: ShopifyAddress | null
  line_items: ShopifyLineItem[]
  tax_lines: ShopifyTaxLine[]
}

export interface ShopifyCustomer {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string | null
  created_at: string
  updated_at: string
  orders_count: number
  total_spent: string
}

export interface ShopifyAddress {
  first_name: string
  last_name: string
  company: string | null
  address1: string
  address2: string | null
  city: string
  province: string
  country: string
  zip: string
  phone: string | null
}

export interface ShopifyLineItem {
  id: string
  product_id: string
  variant_id: string
  title: string
  quantity: number
  price: string
  total_discount: string
  tax_lines: ShopifyTaxLine[]
}

export interface ShopifyTaxLine {
  title: string
  price: string
  rate: number
  channel_liable: boolean
}

export interface ShopifyWebhookPayload {
  id: string
  topic: string
  shop_domain: string
  payload: any
  created_at: string
}

export interface ShopifyApiCredentials {
  shop_domain: string
  access_token: string
  api_version: string
}