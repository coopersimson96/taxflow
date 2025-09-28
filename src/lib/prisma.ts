import { PrismaClient } from '@prisma/client'

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  })
}

// Critical fix: Use proper singleton pattern for Vercel
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

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
  retries: number = 3
): Promise<T> {
  let lastError: Error | null = null
  
  for (let i = 0; i <= retries; i++) {
    try {
      // Force fresh connection for each retry in serverless environments
      if (i > 0 && process.env.VERCEL) {
        await prisma.$disconnect()
        await new Promise(resolve => setTimeout(resolve, 200 + i * 100)) // Increasing delay
      }
      
      return await operation(prisma)
    } catch (error) {
      lastError = error as Error
      console.error(`Database operation failed (attempt ${i + 1}/${retries + 1}):`, {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorName: error instanceof Error ? error.constructor.name : 'Unknown',
        isServerless: !!process.env.VERCEL
      })
      
      // Handle specific Prisma/connection errors in serverless
      if (error instanceof Error) {
        const isConnectionError = error.message.includes('prepared statement') || 
                                 error.message.includes('connection') ||
                                 error.message.includes('timeout') ||
                                 error.message.includes('ECONNRESET')
        
        if (isConnectionError && i < retries) {
          console.log('Connection error detected, retrying with fresh connection...')
          try {
            await prisma.$disconnect()
          } catch (disconnectError) {
            console.error('Error during disconnect:', disconnectError)
          }
          continue // Retry
        }
      }
      
      // If not a connection error or out of retries, throw immediately
      if (i === retries) {
        break
      }
    }
  }
  
  throw lastError
}