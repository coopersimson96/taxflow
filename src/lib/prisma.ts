import { PrismaClient } from '@prisma/client'

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

// Prevent multiple instances of Prisma Client in development
export const prisma = globalThis.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma
}

// Database connection utility functions
export async function connectToDatabase() {
  try {
    await prisma.$connect()
    console.log('✅ Database connected successfully')
    return true
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    return false
  }
}

export async function disconnectFromDatabase() {
  try {
    await prisma.$disconnect()
    console.log('✅ Database disconnected successfully')
  } catch (error) {
    console.error('❌ Database disconnection failed:', error)
  }
}

// Health check function
export async function checkDatabaseHealth() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return { status: 'healthy', timestamp: new Date().toISOString() }
  } catch (error) {
    return { 
      status: 'unhealthy', 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString() 
    }
  }
}

// Transaction wrapper utility
export async function withTransaction<T>(
  callback: (tx: any) => Promise<T>
): Promise<T> {
  return await prisma.$transaction(callback)
}

// Webhook-specific database operations with connection retry
export async function withWebhookDb<T>(
  operation: (client: PrismaClient) => Promise<T>,
  retries: number = 2
): Promise<T> {
  let lastError: Error | null = null
  
  for (let i = 0; i <= retries; i++) {
    try {
      return await operation(prisma)
    } catch (error) {
      lastError = error as Error
      console.error(`Database operation failed (attempt ${i + 1}/${retries + 1}):`, error)
      
      // If it's a prepared statement error, try to disconnect and reconnect
      if (error instanceof Error && error.message.includes('prepared statement')) {
        console.log('Attempting to reset connection...')
        try {
          await prisma.$disconnect()
          await new Promise(resolve => setTimeout(resolve, 100)) // Brief delay
        } catch (disconnectError) {
          console.error('Error during disconnect:', disconnectError)
        }
      } else {
        // For other errors, don't retry
        throw error
      }
    }
  }
  
  throw lastError
}