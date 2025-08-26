/**
 * Application Constants
 * Centralized configuration to avoid hardcoded values throughout the codebase
 */

// Shopify API Configuration
export const SHOPIFY_CONFIG = {
  API_VERSION: '2024-01',
  MAX_ORDERS_PER_REQUEST: 250,
  PAYOUT_LIMIT: 5,
  WEBHOOK_TIMEOUT_MS: 30000, // 30 seconds
} as const

// Fee Structure (updated regularly based on Shopify's published rates)
export const SHOPIFY_FEES = {
  BASIC: { percent: 0.029, fixed: 0.30 },    // 2.9% + $0.30
  SHOPIFY: { percent: 0.026, fixed: 0.30 },  // 2.6% + $0.30  
  ADVANCED: { percent: 0.024, fixed: 0.30 }, // 2.4% + $0.30
  PLUS: { percent: 0.023, fixed: 0.30 },     // 2.3% + $0.30
} as const

// Tax Configuration
export const TAX_CONFIG = {
  DEFAULT_TAX_RATE: 0.30, // 30% default tax rate
  MIN_TAX_RATE: 0.0,      // 0% minimum
  MAX_TAX_RATE: 0.50,     // 50% maximum
} as const

// Time-based Configuration
export const TIME_CONFIG = {
  SESSION_MAX_AGE_DAYS: 30,
  PAYOUT_PROCESSING_DAYS: 2, // Standard Shopify processing time
  HISTORICAL_IMPORT_DAYS_BACK: 90,
  POLLING_TIMEOUT_MS: 300000, // 5 minutes
  POLLING_INTERVAL_MS: 2000,  // 2 seconds
} as const

// Date Range Presets
export const DATE_RANGES = {
  TODAY: 'today',
  SEVEN_DAYS: '7days', 
  THIRTY_DAYS: '30days',
  NINETY_DAYS: '90days',
  ONE_YEAR: '1year',
  CUSTOM: 'custom',
} as const

// Chart Configuration
export const CHART_CONFIG = {
  MARGIN: { top: 5, right: 30, left: 20, bottom: 5 },
  DEFAULT_RANGE_DAYS: 30,
} as const

// Security Configuration
export const SECURITY_CONFIG = {
  MIN_PASSWORD_LENGTH: 8,
  BCRYPT_ROUNDS: 12,
  RATE_LIMIT_REQUESTS: 100,
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
} as const

// Database Configuration
export const DB_CONFIG = {
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 250,
  CONNECTION_TIMEOUT_MS: 10000,
} as const

// Default URLs (development)
export const DEFAULT_URLS = {
  LOCAL_DEV: 'http://localhost:3000',
  PRODUCTION: process.env.NEXTAUTH_URL || 'https://taxflow-smoky.vercel.app',
} as const

// Feature Flags
export const FEATURES = {
  ENABLE_DEBUG_MODE: process.env.NODE_ENV === 'development',
  ENABLE_PAYOUT_API: false, // Disabled until payment scope approved
  ENABLE_CALCULATED_PAYOUTS: true,
} as const

// Validation Rules
export const VALIDATION = {
  SHOP_DOMAIN_MAX_LENGTH: 60,
  ORDER_NUMBER_MAX_LENGTH: 50,
  CURRENCY_CODE_LENGTH: 3,
} as const