-- CreateTable
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

-- CreateIndex
CREATE UNIQUE INDEX "user_emails_email_key" ON "user_emails"("email");

-- CreateIndex
CREATE INDEX "user_emails_userId_idx" ON "user_emails"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_emails_userId_isPrimary_key" ON "user_emails"("userId", "isPrimary") WHERE "isPrimary" = true;

-- AddForeignKey
ALTER TABLE "user_emails" ADD CONSTRAINT "user_emails_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
FROM "users";