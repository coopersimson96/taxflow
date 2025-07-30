/**
 * Environment Variable Validation and Type Safety
 * 
 * This module validates environment variables and provides type-safe access
 * to configuration values throughout the application.
 */

import { z } from 'zod'

// Define the schema for environment variables
const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(1, 'NEXTAUTH_SECRET is required'),
  
  // Database - Required
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  
  // Supabase - Optional but recommended
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  
  // Shopify API - Optional
  SHOPIFY_API_KEY: z.string().optional(),
  SHOPIFY_API_SECRET: z.string().optional(),
  SHOPIFY_WEBHOOK_SECRET: z.string().optional(),
  SHOPIFY_SCOPES: z.string().default('read_orders,read_products,read_customers,read_analytics'),
  SHOPIFY_APP_URL: z.string().url().optional(),
  
  // Square API - Optional
  SQUARE_APPLICATION_ID: z.string().optional(),
  SQUARE_ACCESS_TOKEN: z.string().optional(),
  SQUARE_WEBHOOK_SIGNATURE_KEY: z.string().optional(),
  SQUARE_ENVIRONMENT: z.enum(['sandbox', 'production']).default('sandbox'),
  
  // Email Service - Optional
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),
  
  // Tax Service API - Optional
  TAX_SERVICE_API_KEY: z.string().optional(),
  TAX_SERVICE_API_URL: z.string().url().optional(),
  
  // Redis - Optional
  REDIS_URL: z.string().url().optional(),
  
  // File Storage - Optional
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default('us-east-1'),
  AWS_S3_BUCKET: z.string().optional(),
  
  // Security
  ENCRYPTION_KEY: z.string().min(32, 'ENCRYPTION_KEY must be at least 32 characters').optional(),
  
  // Webhooks
  WEBHOOK_BASE_URL: z.string().url().optional(),
})

// Parse and validate environment variables
let env: z.infer<typeof envSchema>

try {
  env = envSchema.parse(process.env)
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Environment validation failed:')
    error.errors.forEach((err) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`)
    })
    process.exit(1)
  }
  throw error
}

// Export validated environment variables
export { env }

// Type-safe environment variable access
export const config = {
  // Application settings
  app: {
    env: env.NODE_ENV,
    url: env.NEXTAUTH_URL || 'http://localhost:3000',
    secret: env.NEXTAUTH_SECRET,
    isDevelopment: env.NODE_ENV === 'development',
    isProduction: env.NODE_ENV === 'production',
    isTest: env.NODE_ENV === 'test',
  },
  
  // Database configuration
  database: {
    url: env.DATABASE_URL,
  },
  
  // Supabase configuration
  supabase: {
    url: env.SUPABASE_URL,
    anonKey: env.SUPABASE_ANON_KEY,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    isConfigured: !!(env.SUPABASE_URL && env.SUPABASE_ANON_KEY),
  },
  
  // Shopify configuration
  shopify: {
    apiKey: env.SHOPIFY_API_KEY,
    apiSecret: env.SHOPIFY_API_SECRET,
    webhookSecret: env.SHOPIFY_WEBHOOK_SECRET,
    scopes: env.SHOPIFY_SCOPES.split(',').map(s => s.trim()),
    appUrl: env.SHOPIFY_APP_URL,
    isConfigured: !!(env.SHOPIFY_API_KEY && env.SHOPIFY_API_SECRET),
  },
  
  // Square configuration
  square: {
    applicationId: env.SQUARE_APPLICATION_ID,
    accessToken: env.SQUARE_ACCESS_TOKEN,
    webhookSignatureKey: env.SQUARE_WEBHOOK_SIGNATURE_KEY,
    environment: env.SQUARE_ENVIRONMENT,
    isConfigured: !!(env.SQUARE_APPLICATION_ID && env.SQUARE_ACCESS_TOKEN),
    isSandbox: env.SQUARE_ENVIRONMENT === 'sandbox',
  },
  
  // Email configuration
  email: {
    apiKey: env.RESEND_API_KEY,
    fromEmail: env.RESEND_FROM_EMAIL,
    isConfigured: !!(env.RESEND_API_KEY && env.RESEND_FROM_EMAIL),
  },
  
  // Tax service configuration
  taxService: {
    apiKey: env.TAX_SERVICE_API_KEY,
    apiUrl: env.TAX_SERVICE_API_URL,
    isConfigured: !!(env.TAX_SERVICE_API_KEY && env.TAX_SERVICE_API_URL),
  },
  
  // Redis configuration
  redis: {
    url: env.REDIS_URL,
    isConfigured: !!env.REDIS_URL,
  },
  
  // AWS S3 configuration
  aws: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    region: env.AWS_REGION,
    s3Bucket: env.AWS_S3_BUCKET,
    isConfigured: !!(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.AWS_S3_BUCKET),
  },
  
  // Security configuration
  security: {
    encryptionKey: env.ENCRYPTION_KEY,
    hasEncryption: !!env.ENCRYPTION_KEY,
  },
  
  // Webhook configuration
  webhooks: {
    baseUrl: env.WEBHOOK_BASE_URL,
    isConfigured: !!env.WEBHOOK_BASE_URL,
  },
} as const

// Helper functions for environment validation
export function validateRequiredIntegrations(): {
  valid: boolean
  missing: string[]
  warnings: string[]
} {
  const missing: string[] = []
  const warnings: string[] = []
  
  // Check for basic required variables
  if (!env.DATABASE_URL) missing.push('DATABASE_URL')
  if (!env.NEXTAUTH_SECRET) missing.push('NEXTAUTH_SECRET')
  
  // Check for integration-specific requirements
  if (!config.supabase.isConfigured) {
    warnings.push('Supabase configuration incomplete')
  }
  
  if (!config.shopify.isConfigured) {
    warnings.push('Shopify integration not configured')
  }
  
  if (!config.square.isConfigured) {
    warnings.push('Square integration not configured')
  }
  
  if (!config.email.isConfigured) {
    warnings.push('Email service not configured - notifications will not work')
  }
  
  if (!config.security.hasEncryption) {
    warnings.push('No encryption key set - integration credentials will not be encrypted')
  }
  
  return {
    valid: missing.length === 0,
    missing,
    warnings,
  }
}

export function logEnvironmentStatus(): void {
  const validation = validateRequiredIntegrations()
  
  console.log('\n🔍 Environment Configuration Status:')
  
  // Show what's configured
  const integrations = [
    { name: 'Database', configured: !!env.DATABASE_URL },
    { name: 'Supabase', configured: config.supabase.isConfigured },
    { name: 'Shopify', configured: config.shopify.isConfigured },
    { name: 'Square', configured: config.square.isConfigured },
    { name: 'Email (Resend)', configured: config.email.isConfigured },
    { name: 'Redis Cache', configured: config.redis.isConfigured },
    { name: 'AWS S3', configured: config.aws.isConfigured },
    { name: 'Encryption', configured: config.security.hasEncryption },
  ]
  
  integrations.forEach(({ name, configured }) => {
    console.log(`  ${configured ? '✅' : '⚠️ '} ${name}: ${configured ? 'Configured' : 'Not configured'}`)
  })
  
  if (validation.missing.length > 0) {
    console.log('\n❌ Missing required variables:')
    validation.missing.forEach(variable => {
      console.log(`  - ${variable}`)
    })
  }
  
  if (validation.warnings.length > 0) {
    console.log('\n⚠️  Warnings:')
    validation.warnings.forEach(warning => {
      console.log(`  - ${warning}`)
    })
  }
  
  if (validation.valid && validation.warnings.length === 0) {
    console.log('\n🎉 All configurations are complete!')
  }
}

// Export for runtime checks
export function ensureEnvironment(): void {
  const validation = validateRequiredIntegrations()
  
  if (!validation.valid) {
    console.error('❌ Environment validation failed')
    logEnvironmentStatus()
    process.exit(1)
  }
  
  if (config.app.isDevelopment && validation.warnings.length > 0) {
    logEnvironmentStatus()
  }
}