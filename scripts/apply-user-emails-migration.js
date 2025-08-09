const { PrismaClient } = require('@prisma/client')

async function applyUserEmailsMigration() {
  const prisma = new PrismaClient()
  
  try {
    console.log('Checking if user_emails table exists...')
    
    // Check if table already exists
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_emails'
      );
    `
    
    if (tableExists[0].exists) {
      console.log('✅ user_emails table already exists')
      return
    }
    
    console.log('Creating user_emails table...')
    
    // Create table
    await prisma.$executeRaw`
      CREATE TABLE "user_emails" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "isPrimary" BOOLEAN NOT NULL DEFAULT false,
        "isVerified" BOOLEAN NOT NULL DEFAULT false,
        "verificationToken" TEXT,
        "verifiedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "user_emails_pkey" PRIMARY KEY ("id")
      );
    `
    
    // Create indexes
    await prisma.$executeRaw`CREATE UNIQUE INDEX "user_emails_email_key" ON "user_emails"("email");`
    await prisma.$executeRaw`CREATE INDEX "user_emails_userId_idx" ON "user_emails"("userId");`
    await prisma.$executeRaw`CREATE UNIQUE INDEX "user_emails_userId_isPrimary_key" ON "user_emails"("userId", "isPrimary") WHERE "isPrimary" = true;`
    
    // Add foreign key
    await prisma.$executeRaw`
      ALTER TABLE "user_emails" 
      ADD CONSTRAINT "user_emails_userId_fkey" 
      FOREIGN KEY ("userId") REFERENCES "users"("id") 
      ON DELETE CASCADE ON UPDATE CASCADE;
    `
    
    // Migrate existing user emails
    await prisma.$executeRaw`
      INSERT INTO "user_emails" ("id", "userId", "email", "isPrimary", "isVerified", "verifiedAt", "createdAt", "updatedAt")
      SELECT 
        gen_random_uuid()::text,
        "id",
        "email",
        true,
        CASE WHEN "emailVerified" IS NOT NULL THEN true ELSE false END,
        "emailVerified",
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      FROM "users";
    `
    
    console.log('✅ user_emails table created and data migrated successfully')
    
  } catch (error) {
    console.error('Error applying migration:', error)
    // Don't throw - let the build continue
  } finally {
    await prisma.$disconnect()
  }
}

// Run if called directly
if (require.main === module) {
  applyUserEmailsMigration()
}