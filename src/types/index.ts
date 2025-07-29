// Re-export all types for convenient importing
export * from './shopify'
export * from './square'
export * from './analytics'

// Common types used across the application
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'user' | 'viewer'
  permissions: string[]
  created_at: string
  updated_at: string
}

export interface Integration {
  id: string
  platform: 'shopify' | 'square'
  status: 'connected' | 'disconnected' | 'error'
  credentials_valid: boolean
  last_sync: string | null
  sync_status: 'idle' | 'syncing' | 'error'
  error_message?: string
  settings: IntegrationSettings
}

export interface IntegrationSettings {
  auto_sync: boolean
  sync_frequency: 'realtime' | 'hourly' | 'daily' | 'weekly'
  tax_calculation: boolean
  webhook_enabled: boolean
  data_retention_days: number
}

export interface NotificationSettings {
  email_alerts: boolean
  filing_reminders: boolean
  rate_change_alerts: boolean
  threshold_alerts: boolean
  webhook_failures: boolean
}

export interface AppSettings {
  timezone: string
  currency: string
  date_format: string
  number_format: string
  theme: 'light' | 'dark' | 'auto'
  notifications: NotificationSettings
}