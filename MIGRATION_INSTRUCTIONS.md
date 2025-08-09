# Database Migration Instructions

## To create the `user_emails` table in your production database:

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Run the following SQL:

```sql
-- Create user_emails table
CREATE TABLE IF NOT EXISTS "user_emails" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationToken" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_emails_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS "user_emails_email_key" ON "user_emails"("email");
CREATE INDEX IF NOT EXISTS "user_emails_userId_idx" ON "user_emails"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "user_emails_userId_isPrimary_key" ON "user_emails"("userId", "isPrimary") WHERE "isPrimary" = true;

-- Add foreign key
ALTER TABLE "user_emails" 
ADD CONSTRAINT "user_emails_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "users"("id") 
ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing user emails to the new table
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
FROM "users"
ON CONFLICT DO NOTHING;
```

### Option 2: Using Local Prisma CLI

1. Set your DATABASE_URL environment variable to your production database
2. Run: `npx prisma db push`

### Option 3: Using the Migration Script

1. Run locally with production DATABASE_URL:
   ```bash
   DATABASE_URL="your-production-database-url" node scripts/apply-user-emails-migration.js
   ```

## After Migration

Once the migration is complete:
- The settings page email management will work
- The dashboard will automatically link Shopify emails
- Users can manage multiple email addresses