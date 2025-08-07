#!/usr/bin/env node

/**
 * Apply Tax Breakdown Migration
 * Applies the database migration for enhanced tax breakdown fields
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const config = {
  // Use pooled connection since direct connection hostname is different
  databaseUrl: 'postgresql://postgres.zpxltmcmtfqrgystdvxu:Supabasetaxflow45123@aws-0-ca-central-1.pooler.supabase.com:6543/postgres'
};

async function applyMigration() {
  console.log('🔧 Applying tax breakdown migration...\n');
  
  const client = new Client({
    connectionString: config.databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');
    
    // Migration SQL
    const migrationSQL = `
-- Add detailed tax breakdown fields to transactions table
-- This migration enhances tax tracking for compliance reporting

-- Check if columns already exist before adding them
DO $$ 
BEGIN 
  -- Add new columns for detailed tax analysis
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='gstAmount') THEN
    ALTER TABLE "transactions" ADD COLUMN "gstAmount" INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='pstAmount') THEN
    ALTER TABLE "transactions" ADD COLUMN "pstAmount" INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='hstAmount') THEN
    ALTER TABLE "transactions" ADD COLUMN "hstAmount" INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='qstAmount') THEN
    ALTER TABLE "transactions" ADD COLUMN "qstAmount" INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='stateTaxAmount') THEN
    ALTER TABLE "transactions" ADD COLUMN "stateTaxAmount" INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='localTaxAmount') THEN
    ALTER TABLE "transactions" ADD COLUMN "localTaxAmount" INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='otherTaxAmount') THEN
    ALTER TABLE "transactions" ADD COLUMN "otherTaxAmount" INTEGER DEFAULT 0;
  END IF;

  -- Add tax breakdown details as structured JSON
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='taxBreakdown') THEN
    ALTER TABLE "transactions" ADD COLUMN "taxBreakdown" JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- Add tax jurisdiction information
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='taxCountry') THEN
    ALTER TABLE "transactions" ADD COLUMN "taxCountry" VARCHAR(3);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='taxProvince') THEN
    ALTER TABLE "transactions" ADD COLUMN "taxProvince" VARCHAR(10);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='taxCity') THEN
    ALTER TABLE "transactions" ADD COLUMN "taxCity" VARCHAR(100);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='taxPostalCode') THEN
    ALTER TABLE "transactions" ADD COLUMN "taxPostalCode" VARCHAR(20);
  END IF;
END $$;

-- Add indexes for tax reporting queries (only if they don't exist)
CREATE INDEX IF NOT EXISTS "idx_transactions_tax_country_province" ON "transactions" ("organizationId", "taxCountry", "taxProvince", "transactionDate");
CREATE INDEX IF NOT EXISTS "idx_transactions_gst_amount" ON "transactions" ("organizationId", "gstAmount") WHERE "gstAmount" > 0;
CREATE INDEX IF NOT EXISTS "idx_transactions_pst_amount" ON "transactions" ("organizationId", "pstAmount") WHERE "pstAmount" > 0;
CREATE INDEX IF NOT EXISTS "idx_transactions_tax_breakdown" ON "transactions" USING GIN ("taxBreakdown");
`;

    console.log('🚀 Executing migration SQL...');
    await client.query(migrationSQL);
    console.log('✅ Migration applied successfully!');
    
    // Verify the new columns exist
    console.log('\n🔍 Verifying new columns...');
    const columnsResult = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'transactions' 
      AND column_name IN ('gstAmount', 'pstAmount', 'hstAmount', 'qstAmount', 'stateTaxAmount', 'localTaxAmount', 'otherTaxAmount', 'taxBreakdown', 'taxCountry', 'taxProvince', 'taxCity', 'taxPostalCode')
      ORDER BY column_name
    `);
    
    console.log(`Found ${columnsResult.rows.length} new columns:`);
    columnsResult.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (default: ${col.column_default || 'none'})`);
    });
    
    // Verify indexes
    console.log('\n🔍 Verifying new indexes...');
    const indexResult = await client.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'transactions' 
      AND indexname LIKE '%tax%'
      ORDER BY indexname
    `);
    
    console.log(`Found ${indexResult.rows.length} tax-related indexes:`);
    indexResult.rows.forEach(idx => {
      console.log(`  - ${idx.indexname}`);
    });

  } catch (error) {
    console.error('❌ Migration error:', error.message);
    throw error;
  } finally {
    await client.end();
    console.log('✅ Database connection closed');
  }
}

async function main() {
  console.log('📊 TAX BREAKDOWN MIGRATION');
  console.log('===========================');
  
  try {
    await applyMigration();
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('\nNew tax breakdown capabilities:');
    console.log('✅ Individual tax amounts (GST, PST, HST, QST, State, Local, Other)');
    console.log('✅ Detailed tax breakdown JSON with rates and jurisdictions');
    console.log('✅ Tax jurisdiction tracking (country, province, city, postal code)');
    console.log('✅ Optimized indexes for tax reporting queries');
    console.log('\n🎯 Next: Update webhook handlers to populate these new fields');
    
  } catch (error) {
    console.error('\n💥 Migration failed:', error.message);
    process.exit(1);
  }
}

main();