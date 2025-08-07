#!/usr/bin/env node

/**
 * Check Recent Transactions
 * Quick script to view recent webhook-created transactions
 */

const { Client } = require('pg');

const config = {
  databaseUrl: 'postgresql://postgres.zpxltmcmtfqrgystdvxu:Supabasetaxflow45123@aws-0-ca-central-1.pooler.supabase.com:6543/postgres'
};

async function checkRecentTransactions() {
  console.log('🔍 Checking recent transactions...\n');
  
  const client = new Client({
    connectionString: config.databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    // Get recent transactions from the last 24 hours
    const result = await client.query(`
      SELECT 
        id,
        "externalId",
        "orderNumber", 
        type,
        status,
        "totalAmount",
        "taxAmount",
        "customerEmail",
        "transactionDate",
        "createdAt",
        metadata
      FROM transactions 
      WHERE "createdAt" >= NOW() - INTERVAL '24 hours'
      ORDER BY "createdAt" DESC
      LIMIT 10
    `);

    if (result.rows.length === 0) {
      console.log('❌ No transactions found in the last 24 hours');
      console.log('This could mean:');
      console.log('1. No orders have been placed in your Shopify store');
      console.log('2. Webhooks are not reaching the server');
      console.log('3. Database connection issues');
    } else {
      console.log(`✅ Found ${result.rows.length} recent transaction(s):\n`);
      
      result.rows.forEach((transaction, index) => {
        console.log(`${index + 1}. Transaction ID: ${transaction.id}`);
        console.log(`   Shopify Order ID: ${transaction.externalId}`);
        console.log(`   Order Number: ${transaction.orderNumber || 'N/A'}`);
        console.log(`   Type: ${transaction.type}`);
        console.log(`   Status: ${transaction.status}`);
        console.log(`   Total: $${(transaction.totalAmount / 100).toFixed(2)}`);
        console.log(`   Tax: $${(transaction.taxAmount / 100).toFixed(2)}`);
        console.log(`   Customer: ${transaction.customerEmail || 'N/A'}`);
        console.log(`   Order Date: ${transaction.transactionDate}`);
        console.log(`   Created: ${transaction.createdAt}`);
        console.log(`   Source: ${transaction.metadata?.shopifyOrderId ? 'Shopify Webhook' : 'Other'}`);
        console.log('');
      });
    }

    // Also check integration status
    const integrationResult = await client.query(`
      SELECT 
        id,
        type,
        status,
        "lastSyncAt",
        "syncStatus",
        credentials->>'shop' as shop
      FROM integrations 
      WHERE type = 'SHOPIFY'
      ORDER BY "createdAt" DESC
      LIMIT 1
    `);

    if (integrationResult.rows.length > 0) {
      const integration = integrationResult.rows[0];
      console.log('📋 Shopify Integration Status:');
      console.log(`   Shop: ${integration.shop}`);
      console.log(`   Status: ${integration.status}`);
      console.log(`   Sync Status: ${integration.syncStatus}`);
      console.log(`   Last Sync: ${integration.lastSyncAt}`);
    }

  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await client.end();
  }
}

async function main() {
  console.log('📊 TRANSACTION DATABASE CHECK');
  console.log('=============================');
  await checkRecentTransactions();
  
  console.log('\n🎯 TO TEST WEBHOOK SYSTEM:');
  console.log('1. Place a test order in your Shopify store');
  console.log('2. Run this script again to see if the transaction appears');
  console.log('3. Check Vercel logs for webhook processing confirmation');
}

main().catch(console.error);