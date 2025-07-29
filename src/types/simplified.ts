// Simplified Tax Tracking Types - Focused on Core Value Proposition

export interface TaxTransaction {
  id: string
  date: string
  platform: 'shopify' | 'square'
  platform_transaction_id: string
  total_amount: number
  tax_amount: number
  customer_location?: string
}

export interface TaxSummary {
  total_sales: number
  total_tax_collected: number
  transaction_count: number
  tax_to_set_aside: number // This is the key metric - how much to set aside
  average_tax_rate: number
  period_start: string
  period_end: string
}

export interface TaxAlert {
  id: string
  type: 'set_aside_reminder' | 'weekly_summary' | 'monthly_summary'
  message: string
  amount_to_set_aside: number
  created_at: string
  acknowledged: boolean
}

export interface PlatformConnection {
  platform: 'shopify' | 'square'
  connected: boolean
  store_name?: string
  last_sync?: string
  sync_status: 'active' | 'error' | 'disconnected'
}

export interface DashboardData {
  current_summary: TaxSummary
  recent_transactions: TaxTransaction[]
  platform_connections: PlatformConnection[]
  pending_alerts: TaxAlert[]
}

// Email notification preferences
export interface NotificationSettings {
  weekly_summary: boolean
  monthly_summary: boolean
  set_aside_alerts: boolean
  threshold_amount: number // Only send alert if tax amount exceeds this
  email: string
}

// Simple user profile for small business owners
export interface UserProfile {
  business_name: string
  owner_name: string
  email: string
  notification_settings: NotificationSettings
  created_at: string
}