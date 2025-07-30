#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

interface SetupOptions {
  reset?: boolean
  seed?: boolean
  migrate?: boolean
  generate?: boolean
}

async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$connect()
    console.log('✅ Database connection successful')
    return true
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    return false
  }
}

async function generatePrismaClient(): Promise<void> {
  console.log('🔄 Generating Prisma client...')
  try {
    execSync('npx prisma generate', { stdio: 'inherit' })
    console.log('✅ Prisma client generated successfully')
  } catch (error) {
    console.error('❌ Failed to generate Prisma client:', error)
    throw error
  }
}

async function pushDatabaseSchema(): Promise<void> {
  console.log('🔄 Pushing database schema...')
  try {
    execSync('npx prisma db push', { stdio: 'inherit' })
    console.log('✅ Database schema pushed successfully')
  } catch (error) {
    console.error('❌ Failed to push database schema:', error)
    throw error
  }
}

async function runMigrations(): Promise<void> {
  console.log('🔄 Running database migrations...')
  try {
    execSync('npx prisma migrate deploy', { stdio: 'inherit' })
    console.log('✅ Database migrations completed successfully')
  } catch (error) {
    console.error('❌ Failed to run database migrations:', error)
    throw error
  }
}

async function seedDatabase(): Promise<void> {
  console.log('🔄 Seeding database with initial data...')
  try {
    execSync('npx prisma db seed', { stdio: 'inherit' })
    console.log('✅ Database seeded successfully')
  } catch (error) {
    console.error('❌ Failed to seed database:', error)
    throw error
  }
}

async function resetDatabase(): Promise<void> {
  console.log('🔄 Resetting database...')
  console.log('⚠️  This will delete all data!')
  
  try {
    execSync('npx prisma migrate reset --force', { stdio: 'inherit' })
    console.log('✅ Database reset successfully')
  } catch (error) {
    console.error('❌ Failed to reset database:', error)
    throw error
  }
}

async function checkEnvironmentVariables(): Promise<boolean> {
  const requiredVars = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
  ]

  const optionalVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SHOPIFY_API_KEY',
    'SQUARE_APPLICATION_ID',
    'RESEND_API_KEY',
  ]

  console.log('🔍 Checking environment variables...')

  let allRequired = true
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      console.error(`❌ Missing required environment variable: ${varName}`)
      allRequired = false
    } else {
      console.log(`✅ ${varName} is set`)
    }
  }

  let hasOptional = false
  for (const varName of optionalVars) {
    if (process.env[varName]) {
      console.log(`✅ ${varName} is set`)
      hasOptional = true
    } else {
      console.log(`⚠️  Optional environment variable not set: ${varName}`)
    }
  }

  if (!allRequired) {
    console.log('\n📝 Please check your .env.local file and ensure all required variables are set.')
    return false
  }

  if (!hasOptional) {
    console.log('\n⚠️  No optional integration variables found. You can add them later when setting up integrations.')
  }

  return true
}

async function createEnvFileIfMissing(): Promise<void> {
  const envLocalPath = path.join(process.cwd(), '.env.local')
  const envExamplePath = path.join(process.cwd(), '.env.example')

  if (!fs.existsSync(envLocalPath)) {
    if (fs.existsSync(envExamplePath)) {
      console.log('📝 Creating .env.local from .env.example...')
      fs.copyFileSync(envExamplePath, envLocalPath)
      console.log('✅ .env.local created successfully')
      console.log('⚠️  Please update .env.local with your actual credentials before proceeding.')
    } else {
      console.error('❌ Neither .env.local nor .env.example found!')
      console.log('Please create .env.local with your database and API credentials.')
    }
  } else {
    console.log('✅ .env.local file exists')
  }
}

async function validateDatabaseSchema(): Promise<boolean> {
  try {
    console.log('🔍 Validating database schema...')
    
    // Check if main tables exist
    const tables = ['users', 'organizations', 'integrations', 'transactions', 'tax_periods', 'notifications']
    
    for (const table of tables) {
      const result = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = ${table}
        );
      ` as [{ exists: boolean }]
      
      if (result[0].exists) {
        console.log(`✅ Table '${table}' exists`)
      } else {
        console.log(`❌ Table '${table}' missing`)
        return false
      }
    }
    
    console.log('✅ Database schema validation completed')
    return true
  } catch (error) {
    console.error('❌ Schema validation failed:', error)
    return false
  }
}

async function showDatabaseInfo(): Promise<void> {
  try {
    console.log('\n📊 Database Information:')
    
    const userCount = await prisma.user.count()
    const orgCount = await prisma.organization.count()
    const integrationCount = await prisma.integration.count()
    const transactionCount = await prisma.transaction.count()
    const taxPeriodCount = await prisma.taxPeriod.count()
    const notificationCount = await prisma.notification.count()
    
    console.log(`👥 Users: ${userCount}`)
    console.log(`🏢 Organizations: ${orgCount}`)
    console.log(`🔌 Integrations: ${integrationCount}`)
    console.log(`💰 Transactions: ${transactionCount}`)
    console.log(`📅 Tax Periods: ${taxPeriodCount}`)
    console.log(`🔔 Notifications: ${notificationCount}`)
    
  } catch (error) {
    console.error('❌ Failed to retrieve database info:', error)
  }
}

async function fullSetup(options: SetupOptions = {}): Promise<void> {
  console.log('🚀 Starting full database setup...\n')
  
  try {
    // Step 1: Check environment
    await createEnvFileIfMissing()
    
    if (!await checkEnvironmentVariables()) {
      process.exit(1)
    }
    
    // Step 2: Generate Prisma client
    if (options.generate !== false) {
      await generatePrismaClient()
    }
    
    // Step 3: Check database connection
    if (!await checkDatabaseConnection()) {
      console.log('\n💡 Make sure your DATABASE_URL is correct and the database is accessible.')
      process.exit(1)
    }
    
    // Step 4: Handle database schema
    if (options.reset) {
      await resetDatabase()
    } else if (options.migrate) {
      await runMigrations()
    } else {
      await pushDatabaseSchema()
    }
    
    // Step 5: Validate schema
    if (!await validateDatabaseSchema()) {
      console.log('❌ Database schema validation failed')
      process.exit(1)
    }
    
    // Step 6: Seed database
    if (options.seed !== false) {
      await seedDatabase()
    }
    
    // Step 7: Show database info
    await showDatabaseInfo()
    
    console.log('\n🎉 Database setup completed successfully!')
    console.log('\n📚 Next steps:')
    console.log('1. Start the development server: npm run dev')
    console.log('2. Open Prisma Studio: npm run db:studio')
    console.log('3. Visit your app at: http://localhost:3000')
    
  } catch (error) {
    console.error('\n❌ Database setup failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2)
  const command = args[0]
  
  switch (command) {
    case 'check':
      await checkDatabaseConnection()
      await checkEnvironmentVariables()
      break
      
    case 'generate':
      await generatePrismaClient()
      break
      
    case 'push':
      await pushDatabaseSchema()
      break
      
    case 'migrate':
      await runMigrations()
      break
      
    case 'seed':
      await seedDatabase()
      break
      
    case 'reset':
      await fullSetup({ reset: true })
      break
      
    case 'validate':
      if (await checkDatabaseConnection()) {
        await validateDatabaseSchema()
        await showDatabaseInfo()
      }
      break
      
    case 'info':
      if (await checkDatabaseConnection()) {
        await showDatabaseInfo()
      }
      break
      
    case 'setup':
    default:
      await fullSetup()
      break
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })
}

export {
  checkDatabaseConnection,
  generatePrismaClient,
  pushDatabaseSchema,
  runMigrations,
  seedDatabase,
  resetDatabase,
  checkEnvironmentVariables,
  validateDatabaseSchema,
  showDatabaseInfo,
  fullSetup
}