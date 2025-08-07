#!/usr/bin/env node

/**
 * Check Recent Real Orders
 * Examines actual Shopify orders (not test data) to verify calculations
 */

const { Client } = require('pg');

const config = {
  databaseUrl: 'postgresql://postgres.zpxltmcmtfqrgystdvxu:Supabasetaxflow45123@aws-0-ca-central-1.pooler.supabase.com:6543/postgres'
};

async function checkRecentRealOrders() {
  console.log('🔍 CHECKING RECENT REAL SHOPIFY ORDERS');
  console.log('======================================\n');
  
  const client = new Client({
    connectionString: config.databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    // Find real Shopify orders (exclude our test orders)
    const result = await client.query(`
      SELECT 
        "orderNumber",
        "externalId", 
        currency,
        "subtotal",
        "taxAmount",
        "totalAmount",
        "discountAmount",
        "shippingAmount",
        "gstAmount",
        "pstAmount",
        "stateTaxAmount",
        "taxCountry",
        "taxProvince",
        "customerEmail",
        "createdAt",
        "taxDetails",
        metadata
      FROM transactions 
      WHERE "customerEmail" NOT LIKE 'test%@%'  -- Exclude test emails
      AND "customerEmail" IS NOT NULL
      AND "createdAt" >= NOW() - INTERVAL '7 days'  -- Last week
      ORDER BY "createdAt" DESC
      LIMIT 10
    `);

    if (result.rows.length === 0) {
      console.log('❌ No real Shopify orders found in the last 7 days');
      console.log('Only test orders are being processed');
      return;
    }

    console.log(`✅ Found ${result.rows.length} real Shopify order(s) in the last 7 days:\n`);
    
    let issuesFound = 0;
    
    result.rows.forEach((order, index) => {
      console.log(`${index + 1}. 📄 ORDER ${order.orderNumber}`);
      console.log(`   Shopify ID: ${order.externalId}`);
      console.log(`   Customer: ${order.customerEmail}`);
      console.log(`   Location: ${order.taxCountry}${order.taxProvince ? '/' + order.taxProvince : ''}`);
      console.log(`   Date: ${new Date(order.createdAt).toLocaleDateString()}`);
      
      // Display amounts
      console.log(`   💰 Amounts (${order.currency}):`);
      console.log(`      Subtotal: $${(order.subtotal / 100).toFixed(2)}`);
      console.log(`      Tax: $${(order.taxAmount / 100).toFixed(2)}`);
      console.log(`      Total: $${(order.totalAmount / 100).toFixed(2)}`);
      console.log(`      Shipping: $${(order.shippingAmount / 100).toFixed(2)}`);
      console.log(`      Discount: $${(order.discountAmount / 100).toFixed(2)}`);
      
      // Tax breakdown
      if (order.gstAmount > 0 || order.pstAmount > 0 || order.stateTaxAmount > 0) {
        console.log(`   🏷️ Tax Breakdown:`);
        if (order.gstAmount > 0) console.log(`      GST: $${(order.gstAmount / 100).toFixed(2)}`);
        if (order.pstAmount > 0) console.log(`      PST: $${(order.pstAmount / 100).toFixed(2)}`);
        if (order.stateTaxAmount > 0) console.log(`      State: $${(order.stateTaxAmount / 100).toFixed(2)}`);
        
        // Validate tax breakdown
        const calculatedTax = order.gstAmount + order.pstAmount + order.stateTaxAmount;
        const difference = Math.abs(calculatedTax - order.taxAmount);
        
        if (difference > 1) {
          console.log(`      ❌ MISMATCH: Breakdown total $${(calculatedTax / 100).toFixed(2)} vs Stored $${(order.taxAmount / 100).toFixed(2)}`);
          issuesFound++;
        } else {
          console.log(`      ✅ Tax breakdown matches stored amount`);
        }
      }
      
      // Check for suspicious amounts
      if (order.totalAmount > 1000000) { // > $10,000
        console.log(`      🚨 SUSPICIOUS: Very high total amount!`);
        issuesFound++;
      }
      
      if (order.subtotal > order.totalAmount) {
        console.log(`      🚨 SUSPICIOUS: Subtotal higher than total!`);
        issuesFound++;
      }
      
      // Look for order 1028 specifically
      if (order.orderNumber && order.orderNumber.toString().includes('1028')) {
        console.log(`      🎯 FOUND ORDER 1028!`);
        
        // Show raw webhook data for analysis
        if (order.taxDetails && Array.isArray(order.taxDetails)) {
          console.log(`      📨 Raw Shopify Tax Data:`);
          order.taxDetails.forEach((tax, i) => {
            console.log(`        ${i + 1}. ${tax.title}: $${tax.price} (${(tax.rate * 100).toFixed(2)}%)`);
          });
        }
        
        if (order.metadata && typeof order.metadata === 'object') {
          console.log(`      🔍 Webhook Metadata:`);
          Object.entries(order.metadata).forEach(([key, value]) => {
            if (key.toLowerCase().includes('price') || key.toLowerCase().includes('amount')) {
              console.log(`        ${key}: ${value}`);
            }
          });
        }
      }
      
      console.log('   ' + '-'.repeat(50));
      console.log('');
    });
    
    // Summary
    console.log('📊 ANALYSIS SUMMARY:');
    console.log('===================');
    if (issuesFound === 0) {
      console.log('✅ All calculations appear correct in recent real orders');
      console.log('✅ Tax breakdowns match stored amounts');
      console.log('✅ No suspicious amounts detected');
    } else {
      console.log(`❌ Found ${issuesFound} potential issue(s) in recent orders`);
    }
    
    // Check if we found order 1028
    const order1028Found = result.rows.some(order => 
      order.orderNumber && order.orderNumber.toString().includes('1028')
    );
    
    if (order1028Found) {
      console.log('\n🎯 Order 1028 was found and analyzed above');
    } else {
      console.log('\n❓ Order 1028 not found in recent real orders');
      console.log('   Possible reasons:');
      console.log('   - Order is older than 7 days');
      console.log('   - Order not yet processed by webhook');
      console.log('   - Order from different Shopify store');
    }

  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await client.end();
  }
}

async function main() {
  await checkRecentRealOrders();
  
  console.log('\n🎯 RECOMMENDATIONS:');
  console.log('===================');
  console.log('1. If no issues found: Current webhook processing is working correctly');
  console.log('2. If order 1028 not found: Check if webhook was received for this order');
  console.log('3. Place a new test order in Shopify to verify current calculations');
  console.log('4. Check Vercel logs for any webhook processing errors');
}

main().catch(console.error);