#!/bin/bash

# Kill any existing Prisma Studio instances
echo "Stopping any existing Prisma Studio instances..."
lsof -ti:5555 | xargs kill -9 2>/dev/null

# Set the production DATABASE_URL
export DATABASE_URL="postgresql://postgres.zpxltmcmtfqrgystdvxu:Supabasetaxflow45123@aws-0-ca-central-1.pooler.supabase.com:6543/postgres"

# Run Prisma Studio with production database
echo "Starting Prisma Studio with production database..."
npx prisma studio