#!/usr/bin/env node

/**
 * Investigate Order #1028 Price Discrepancy
 * Examines the specific order to understand the calculation error
 */

const { Client } = require('pg');

const config = {
  databaseUrl: 'postgresql://postgres.zpxltmcmtfqrgystdvxu:Supabasetaxflow45123@aws-0-ca-central-1.pooler.supabase.com:6543/postgres'
};

async function investigateOrder1028() {
  console.log('🔍 INVESTIGATING ORDER #1028 PRICE DISCREPANCY');
  console.log('===============================================\n');
  
  const client = new Client({
    connectionString: config.databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    // Find order #1028
    const result = await client.query(`
      SELECT 
        id,
        "externalId",
        "orderNumber",
        currency,
        "subtotal",
        "taxAmount", 
        "totalAmount",
        "discountAmount",
        "shippingAmount",
        
        -- Enhanced tax breakdown
        "gstAmount",
        "pstAmount",
        "stateTaxAmount",
        "taxCountry",
        "taxProvince",
        "taxCity",
        
        -- Raw webhook data for comparison
        "taxDetails",
        metadata,
        "customerEmail",
        "createdAt"
        
      FROM transactions 
      WHERE "orderNumber" = '1028'
      ORDER BY "createdAt" DESC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      console.log('❌ Order #1028 not found in database');
      console.log('Checking recent orders to find similar issue...\n');
      
      // Check recent Canadian orders instead
      const recentResult = await client.query(`
        SELECT 
          "orderNumber",
          "externalId", 
          "subtotal",
          "taxAmount",
          "totalAmount",
          "taxDetails",
          metadata,
          "createdAt"
        FROM transactions 
        WHERE "taxCountry" = 'CA'
        OR "taxProvince" = 'BC'
        OR currency = 'CAD'
        ORDER BY "createdAt" DESC
        LIMIT 5
      `);
      
      if (recentResult.rows.length > 0) {
        console.log('📋 Recent Canadian orders for comparison:');
        recentResult.rows.forEach((tx, index) => {
          console.log(`\n${index + 1}. Order ${tx.orderNumber} (${tx.externalId}):`);
          console.log(`   Stored Subtotal: $${(tx.subtotal / 100).toFixed(2)}`);
          console.log(`   Stored Tax: $${(tx.taxAmount / 100).toFixed(2)}`);
          console.log(`   Stored Total: $${(tx.totalAmount / 100).toFixed(2)}`);
          
          if (tx.taxDetails && Array.isArray(tx.taxDetails)) {
            console.log(`   Raw Tax Lines from Shopify:`);
            tx.taxDetails.forEach((taxLine, i) => {
              console.log(`     ${i + 1}. ${taxLine.title}: $${taxLine.price} (rate: ${taxLine.rate})`);
            });
          }
          
          if (tx.metadata && typeof tx.metadata === 'object') {
            const meta = tx.metadata;
            if (meta.shopifyOrderId) {
              console.log(`   Shopify Order ID: ${meta.shopifyOrderId}`);
            }
          }
        });
      }
      return;
    }

    const order = result.rows[0];
    
    console.log(`📋 ORDER #1028 DATABASE VALUES:`);
    console.log(`================================`);
    console.log(`Transaction ID: ${order.id}`);
    console.log(`Shopify Order ID: ${order.externalId}`);
    console.log(`Currency: ${order.currency}`);
    console.log(`Customer: ${order.customerEmail}`);
    console.log(`Location: ${order.taxCity}, ${order.taxProvince}, ${order.taxCountry}`);
    console.log('');
    
    console.log(`💰 STORED AMOUNTS (in database):`);
    console.log(`Subtotal: $${(order.subtotal / 100).toFixed(2)}`);
    console.log(`Tax Amount: $${(order.taxAmount / 100).toFixed(2)}`);
    console.log(`Total Amount: $${(order.totalAmount / 100).toFixed(2)}`);
    console.log(`Discount: $${(order.discountAmount / 100).toFixed(2)}`);
    console.log(`Shipping: $${(order.shippingAmount / 100).toFixed(2)}`);
    console.log('');
    
    console.log(`🏷️ TAX BREAKDOWN:`);
    console.log(`GST: $${(order.gstAmount / 100).toFixed(2)}`);
    console.log(`PST: $${(order.pstAmount / 100).toFixed(2)}`);
    console.log(`State Tax: $${(order.stateTaxAmount / 100).toFixed(2)}`);
    console.log('');
    
    // Analyze raw webhook data
    if (order.taxDetails && Array.isArray(order.taxDetails)) {
      console.log(`📨 RAW SHOPIFY WEBHOOK TAX DATA:`);
      console.log(`===============================`);
      let totalTaxFromWebhook = 0;
      
      order.taxDetails.forEach((taxLine, index) => {
        const taxAmount = parseFloat(taxLine.price || '0');
        totalTaxFromWebhook += taxAmount;
        console.log(`${index + 1}. ${taxLine.title}:`);
        console.log(`   Price: "${taxLine.price}" → Parsed: $${taxAmount.toFixed(2)}`);
        console.log(`   Rate: ${taxLine.rate} (${(taxLine.rate * 100).toFixed(2)}%)`);
        
        if (taxLine.price_set) {
          console.log(`   Shop Money: ${taxLine.price_set.shop_money?.amount} ${taxLine.price_set.shop_money?.currency_code}`);
        }
        console.log('');
      });
      
      console.log(`Total Tax from Webhook: $${totalTaxFromWebhook.toFixed(2)}`);
      console.log(`Stored Tax in DB: $${(order.taxAmount / 100).toFixed(2)}`);
      console.log(`Difference: $${Math.abs(totalTaxFromWebhook - (order.taxAmount / 100)).toFixed(2)}`);
    }
    
    // Check metadata for original webhook values
    if (order.metadata && typeof order.metadata === 'object') {
      console.log(`\n🔍 WEBHOOK METADATA ANALYSIS:`);
      console.log(`=============================`);
      const meta = order.metadata;
      
      Object.keys(meta).forEach(key => {
        if (key.includes('Price') || key.includes('Tax') || key.includes('Amount') || key.includes('Total')) {
          console.log(`${key}: ${meta[key]}`);
        }
      });
    }
    
    // Analysis and recommendations
    console.log(`\n🔍 DISCREPANCY ANALYSIS:`);
    console.log(`========================`);
    
    const expectedShopifyTotal = 69653; // $696.53 in cents
    const actualStoredTotal = order.totalAmount;
    
    if (actualStoredTotal === 10000000) { // $100,000
      console.log('❌ CRITICAL: Amount appears to be multiplied by 100 extra times');
      console.log('   Expected: $696.53 (69653 cents)');
      console.log(`   Stored: $${(actualStoredTotal / 100).toFixed(2)} (${actualStoredTotal} cents)`);
      console.log('   Issue: Likely double conversion from dollars to cents');
      console.log('');
      console.log('🔧 PROBABLE CAUSES:');
      console.log('   1. Shopify webhook sending amounts already in cents, but we\'re multiplying by 100');
      console.log('   2. Currency conversion issue');
      console.log('   3. String parsing error with decimal places');
    }

  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await client.end();
  }
}

async function main() {
  await investigateOrder1028();
  
  console.log('\n🎯 NEXT STEPS:');
  console.log('===============');
  console.log('1. Examine the raw Shopify webhook data structure');
  console.log('2. Check if Shopify sends amounts in dollars vs cents');
  console.log('3. Fix the parsing logic in webhook handlers');
  console.log('4. Test with a new order to verify the fix');
}

main().catch(console.error);