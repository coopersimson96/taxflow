#!/usr/bin/env node

/**
 * Debug Tax Fields
 * Checks if new tax breakdown fields exist in database schema
 */

const { Client } = require('pg');

const config = {
  databaseUrl: 'postgresql://postgres.zpxltmcmtfqrgystdvxu:Supabasetaxflow45123@aws-0-ca-central-1.pooler.supabase.com:6543/postgres'
};

async function debugTaxFields() {
  console.log('🔍 Debugging tax breakdown fields...\n');
  
  const client = new Client({
    connectionString: config.databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    // Check if new tax fields exist in schema
    console.log('1. Checking database schema for tax fields...');
    const schemaResult = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'transactions' 
      AND column_name IN ('gstAmount', 'pstAmount', 'hstAmount', 'qstAmount', 'stateTaxAmount', 'localTaxAmount', 'otherTaxAmount', 'taxBreakdown', 'taxCountry', 'taxProvince', 'taxCity', 'taxPostalCode')
      ORDER BY column_name
    `);
    
    if (schemaResult.rows.length === 0) {
      console.log('❌ New tax fields NOT found in database schema');
      console.log('The migration may not have been applied to the production database.');
      console.log('');
      console.log('🔧 To fix this:');
      console.log('1. The migration was applied locally but not to production');  
      console.log('2. You may need to run the migration on the production database');
      console.log('3. Or check if Prisma migrations are configured for production');
      return;
    }
    
    console.log(`✅ Found ${schemaResult.rows.length} new tax fields in schema:`);
    schemaResult.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });
    
    // Check recent transactions to see if any have the new fields populated
    console.log('\n2. Checking recent transactions for new field data...');
    const dataResult = await client.query(`
      SELECT 
        id, 
        "orderNumber",
        "taxAmount",
        "gstAmount", 
        "pstAmount",
        "stateTaxAmount",
        "taxCountry",
        "taxProvince",
        "createdAt"
      FROM transactions 
      WHERE "createdAt" >= NOW() - INTERVAL '10 minutes'
      ORDER BY "createdAt" DESC 
      LIMIT 5
    `);
    
    if (dataResult.rows.length === 0) {
      console.log('❌ No recent transactions found');
    } else {
      console.log(`✅ Found ${dataResult.rows.length} recent transactions:`);
      
      dataResult.rows.forEach((tx, index) => {
        console.log(`\n   ${index + 1}. Order ${tx.orderNumber} (${tx.id}):`);
        console.log(`      Tax Amount: $${(tx.taxAmount / 100).toFixed(2)}`);
        console.log(`      GST Amount: $${(tx.gstAmount / 100).toFixed(2)}`);
        console.log(`      PST Amount: $${(tx.pstAmount / 100).toFixed(2)}`);
        console.log(`      State Tax: $${(tx.stateTaxAmount / 100).toFixed(2)}`);
        console.log(`      Tax Country: ${tx.taxCountry || 'NULL'}`);
        console.log(`      Tax Province: ${tx.taxProvince || 'NULL'}`);
        console.log(`      Created: ${tx.createdAt}`);
      });
    }
    
    // Check if any transactions have non-zero enhanced tax fields
    console.log('\n3. Looking for transactions with populated enhanced tax fields...');
    const enhancedResult = await client.query(`
      SELECT COUNT(*) as count
      FROM transactions 
      WHERE "gstAmount" > 0 OR "pstAmount" > 0 OR "stateTaxAmount" > 0
    `);
    
    const enhancedCount = parseInt(enhancedResult.rows[0].count);
    
    if (enhancedCount === 0) {
      console.log('❌ No transactions found with enhanced tax fields populated');
      console.log('This suggests the new webhook processing code is not yet deployed or not working');
    } else {
      console.log(`✅ Found ${enhancedCount} transactions with enhanced tax data`);
    }

  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await client.end();
  }
}

async function main() {
  console.log('🔧 TAX FIELDS DEBUG DIAGNOSTIC');
  console.log('===============================');
  await debugTaxFields();
  
  console.log('\n🎯 DIAGNOSIS:');
  console.log('=============');
  console.log('If new tax fields are missing from schema:');
  console.log('  → Migration needs to be applied to production database');
  console.log('');
  console.log('If fields exist but no data is populated:'); 
  console.log('  → New webhook processing code not yet deployed');
  console.log('  → Or there might be an error in the tax processing logic');
}

main().catch(console.error);