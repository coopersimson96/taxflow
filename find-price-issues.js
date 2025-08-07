#!/usr/bin/env node

/**
 * Find Price Calculation Issues
 * Searches for transactions with suspicious amounts that might indicate calculation errors
 */

const { Client } = require('pg');

const config = {
  databaseUrl: 'postgresql://postgres.zpxltmcmtfqrgystdvxu:Supabasetaxflow45123@aws-0-ca-central-1.pooler.supabase.com:6543/postgres'
};

async function findPriceIssues() {
  console.log('🔍 SCANNING FOR PRICE CALCULATION ISSUES');
  console.log('=========================================\n');
  
  const client = new Client({
    connectionString: config.databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    // Look for suspicious amounts
    console.log('1. Looking for unusually high transaction amounts...');
    const highAmountResult = await client.query(`
      SELECT 
        "orderNumber",
        "externalId",
        currency,
        "subtotal",
        "taxAmount", 
        "totalAmount",
        "customerEmail",
        "createdAt"
      FROM transactions 
      WHERE "totalAmount" > 500000  -- More than $5,000
      ORDER BY "totalAmount" DESC
      LIMIT 10
    `);

    if (highAmountResult.rows.length > 0) {
      console.log(`\n❌ Found ${highAmountResult.rows.length} transactions with suspiciously high amounts:`);
      highAmountResult.rows.forEach((tx, index) => {
        console.log(`\n${index + 1}. Order ${tx.orderNumber}:`);
        console.log(`   Subtotal: $${(tx.subtotal / 100).toFixed(2)}`);
        console.log(`   Tax: $${(tx.taxAmount / 100).toFixed(2)}`);
        console.log(`   Total: $${(tx.totalAmount / 100).toFixed(2)} 🚨`);
        console.log(`   Currency: ${tx.currency}`);
        console.log(`   Customer: ${tx.customerEmail || 'N/A'}`);
        console.log(`   Created: ${tx.createdAt}`);
      });
    } else {
      console.log('✅ No transactions with unusually high amounts found');
    }

    // Look for round numbers that might indicate calculation errors
    console.log('\n\n2. Looking for suspiciously round amounts (possible calculation errors)...');
    const roundAmountResult = await client.query(`
      SELECT 
        "orderNumber",
        "externalId", 
        "subtotal",
        "taxAmount",
        "totalAmount",
        "createdAt"
      FROM transactions 
      WHERE "totalAmount" IN (1000000, 5000000, 10000000, 50000000, 100000000)  -- Exact round numbers in cents
      OR "subtotal" IN (1000000, 5000000, 10000000, 50000000, 100000000)
      ORDER BY "createdAt" DESC
      LIMIT 5
    `);

    if (roundAmountResult.rows.length > 0) {
      console.log(`\n❌ Found ${roundAmountResult.rows.length} transactions with suspiciously round amounts:`);
      roundAmountResult.rows.forEach((tx, index) => {
        console.log(`\n${index + 1}. Order ${tx.orderNumber}:`);
        console.log(`   Subtotal: $${(tx.subtotal / 100).toFixed(2)} (${tx.subtotal} cents)`);
        console.log(`   Tax: $${(tx.taxAmount / 100).toFixed(2)} (${tx.taxAmount} cents)`);
        console.log(`   Total: $${(tx.totalAmount / 100).toFixed(2)} (${tx.totalAmount} cents) 🚨`);
        console.log(`   Created: ${tx.createdAt}`);
      });
    } else {
      console.log('✅ No transactions with suspiciously round amounts found');
    }

    // Look for orders where tax breakdown doesn't match total tax
    console.log('\n\n3. Checking for tax calculation mismatches...');
    const taxMismatchResult = await client.query(`
      SELECT 
        "orderNumber",
        "externalId",
        "taxAmount",
        "gstAmount",
        "pstAmount", 
        "stateTaxAmount",
        "localTaxAmount",
        "otherTaxAmount",
        "createdAt"
      FROM transactions 
      WHERE "gstAmount" > 0 OR "pstAmount" > 0 OR "stateTaxAmount" > 0
      ORDER BY "createdAt" DESC
      LIMIT 5
    `);

    if (taxMismatchResult.rows.length > 0) {
      console.log(`\n📋 Checking ${taxMismatchResult.rows.length} recent transactions with tax breakdowns:`);
      
      taxMismatchResult.rows.forEach((tx, index) => {
        const calculatedTotal = tx.gstAmount + tx.pstAmount + tx.stateTaxAmount + tx.localTaxAmount + tx.otherTaxAmount;
        const difference = Math.abs(calculatedTotal - tx.taxAmount);
        
        console.log(`\n${index + 1}. Order ${tx.orderNumber}:`);
        console.log(`   Total Tax (stored): $${(tx.taxAmount / 100).toFixed(2)}`);
        console.log(`   Tax Breakdown:`);
        if (tx.gstAmount > 0) console.log(`     GST: $${(tx.gstAmount / 100).toFixed(2)}`);
        if (tx.pstAmount > 0) console.log(`     PST: $${(tx.pstAmount / 100).toFixed(2)}`);
        if (tx.stateTaxAmount > 0) console.log(`     State: $${(tx.stateTaxAmount / 100).toFixed(2)}`);
        if (tx.localTaxAmount > 0) console.log(`     Local: $${(tx.localTaxAmount / 100).toFixed(2)}`);
        if (tx.otherTaxAmount > 0) console.log(`     Other: $${(tx.otherTaxAmount / 100).toFixed(2)}`);
        
        console.log(`   Calculated Total: $${(calculatedTotal / 100).toFixed(2)}`);
        
        if (difference > 1) { // More than 1 cent difference
          console.log(`   ❌ MISMATCH: $${(difference / 100).toFixed(2)} difference`);
        } else {
          console.log(`   ✅ Tax calculation matches`);
        }
      });
    }

    // Search specifically for order 1028 using LIKE pattern
    console.log('\n\n4. Searching for order 1028 using pattern matching...');
    const order1028Result = await client.query(`
      SELECT 
        "orderNumber",
        "externalId", 
        "subtotal",
        "taxAmount",
        "totalAmount",
        "customerEmail",
        "createdAt",
        metadata
      FROM transactions 
      WHERE "orderNumber" LIKE '%1028%'
      OR "externalId" LIKE '%1028%'
      OR "customerEmail" LIKE '%1028%'
      ORDER BY "createdAt" DESC
      LIMIT 3
    `);

    if (order1028Result.rows.length > 0) {
      console.log(`\n📋 Found ${order1028Result.rows.length} potential matches for order 1028:`);
      order1028Result.rows.forEach((tx, index) => {
        console.log(`\n${index + 1}. Order ${tx.orderNumber} (${tx.externalId}):`);
        console.log(`   Total: $${(tx.totalAmount / 100).toFixed(2)}`);
        console.log(`   Customer: ${tx.customerEmail || 'N/A'}`);
        console.log(`   Created: ${tx.createdAt}`);
        
        if (tx.totalAmount >= 1000000) { // $10,000 or more
          console.log(`   🚨 SUSPICIOUS: This amount is very high!`);
        }
      });
    } else {
      console.log('❌ No matches found for order 1028');
    }

  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await client.end();
  }
}

async function main() {
  await findPriceIssues();
  
  console.log('\n🔍 ANALYSIS SUMMARY:');
  console.log('===================');
  console.log('If suspicious amounts are found:');
  console.log('  → Check webhook parsing logic in route.ts');
  console.log('  → Verify Shopify webhook data format');
  console.log('  → Look for double conversion (dollars to cents twice)');
  console.log('');
  console.log('If no issues found in recent orders:');
  console.log('  → The calculation fix may already be working');
  console.log('  → Order #1028 might be an older order with the old logic');
  console.log('  → Test with a new order to confirm current system works');
}

main().catch(console.error);