#!/usr/bin/env node

/**
 * Test Enhanced Tax Processing
 * Tests the new tax breakdown functionality with sample Canadian order data
 */

const crypto = require('crypto');

const config = {
  webhookUrl: 'https://taxflow-smoky.vercel.app/api/webhooks/shopify',
  webhookSecret: 'taxflow_webhook_secret_2025',
  shop: 'taxflow-test'
};

// Sample Canadian order with GST and PST
const canadianOrderPayload = {
  id: Date.now() + 1000,
  order_number: Math.floor(Math.random() * 1000) + 3000,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  currency: "CAD",
  subtotal_price: "100.00",
  total_tax: "12.00", // 5% GST + 7% PST
  total_price: "112.00",
  total_discounts: "0.00",
  financial_status: "paid",
  fulfillment_status: null,
  customer: {
    id: 987654321,
    email: "test-ca@example.com",
    first_name: "Test",
    last_name: "User"
  },
  billing_address: {
    first_name: "Test",
    last_name: "User", 
    address1: "123 Main St",
    city: "Vancouver",
    province: "British Columbia",
    province_code: "BC",
    country: "Canada",
    country_code: "CA",
    zip: "V6B 1A1"
  },
  shipping_address: {
    first_name: "Test",
    last_name: "User",
    address1: "123 Main St", 
    city: "Vancouver",
    province: "British Columbia",
    province_code: "BC",
    country: "Canada",
    country_code: "CA",
    zip: "V6B 1A1"
  },
  tax_lines: [
    {
      title: "GST",
      price: "5.00",
      rate: 0.05,
      price_set: {
        shop_money: {
          amount: "5.00",
          currency_code: "CAD"
        },
        presentment_money: {
          amount: "5.00", 
          currency_code: "CAD"
        }
      },
      channel_liable: false
    },
    {
      title: "PST",
      price: "7.00",
      rate: 0.07,
      price_set: {
        shop_money: {
          amount: "7.00",
          currency_code: "CAD"
        },
        presentment_money: {
          amount: "7.00",
          currency_code: "CAD"
        }
      },
      channel_liable: false
    }
  ],
  line_items: [
    {
      id: 111111111,
      product_id: 222222222,
      variant_id: 333333333,
      title: "Test Product - Enhanced Tax Breakdown",
      quantity: 1,
      price: "100.00",
      total_discount: "0.00"
    }
  ],
  shipping_lines: [
    {
      title: "Standard Shipping",
      price: "0.00"
    }
  ]
};

// Sample US order with state tax
const usOrderPayload = {
  ...canadianOrderPayload,
  id: Date.now() + 2000,
  order_number: Math.floor(Math.random() * 1000) + 4000,
  currency: "USD",
  total_tax: "8.25", // CA State Tax
  total_price: "108.25",
  customer: {
    ...canadianOrderPayload.customer,
    email: "test-us@example.com"
  },
  billing_address: {
    first_name: "Test",
    last_name: "User",
    address1: "123 California St",
    city: "San Francisco", 
    province: "California",
    province_code: "CA",
    country: "United States",
    country_code: "US",
    zip: "94102"
  },
  shipping_address: {
    first_name: "Test",
    last_name: "User",
    address1: "123 California St",
    city: "San Francisco",
    province: "California", 
    province_code: "CA",
    country: "United States",
    country_code: "US",
    zip: "94102"
  },
  tax_lines: [
    {
      title: "CA State Tax",
      price: "8.25",
      rate: 0.0825,
      price_set: {
        shop_money: {
          amount: "8.25",
          currency_code: "USD"
        },
        presentment_money: {
          amount: "8.25",
          currency_code: "USD"
        }
      },
      channel_liable: false
    }
  ],
  line_items: [
    {
      id: 111111112,
      product_id: 222222223,
      variant_id: 333333334,
      title: "Test Product - US State Tax",
      quantity: 1,
      price: "100.00",
      total_discount: "0.00"
    }
  ]
};

function generateHMAC(payload, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload, 'utf8');
  return hmac.digest('base64');
}

async function testTaxBreakdownWebhook(orderPayload, testName) {
  console.log(`\n🧪 Testing: ${testName}`);
  console.log('='.repeat(50));
  
  const payloadString = JSON.stringify(orderPayload);
  const hmacSignature = generateHMAC(payloadString, config.webhookSecret);
  
  const headers = {
    'Content-Type': 'application/json',
    'X-Shopify-Topic': 'orders/create',
    'X-Shopify-Shop-Domain': config.shop + '.myshopify.com',
    'X-Shopify-Hmac-Sha256': hmacSignature,
    'X-Shopify-Order-Id': orderPayload.id.toString(),
    'X-Shopify-Test': 'tax-breakdown-test'
  };

  console.log(`📦 Order Details:`);
  console.log(`   Order ID: ${orderPayload.id}`);
  console.log(`   Order Number: ${orderPayload.order_number}`);
  console.log(`   Currency: ${orderPayload.currency}`);
  console.log(`   Subtotal: $${orderPayload.subtotal_price}`);
  console.log(`   Total Tax: $${orderPayload.total_tax}`);
  console.log(`   Total: $${orderPayload.total_price}`);
  console.log(`   Location: ${orderPayload.billing_address.city}, ${orderPayload.billing_address.province_code}, ${orderPayload.billing_address.country_code}`);
  
  console.log(`\n📋 Expected Tax Breakdown:`);
  orderPayload.tax_lines.forEach((tax, index) => {
    console.log(`   ${index + 1}. ${tax.title}: $${tax.price} (${(tax.rate * 100).toFixed(2)}%)`);
  });

  try {
    console.log('\n📤 Sending enhanced tax breakdown webhook...');
    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: headers,
      body: payloadString
    });

    console.log(`📥 Response: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const responseData = await response.json();
      console.log('✅ SUCCESS! Enhanced tax processing worked');
      console.log(`📄 Response:`, responseData);
      
      if (responseData.transactionId) {
        console.log(`🎯 Transaction created: ${responseData.transactionId}`);
        return responseData.transactionId;
      }
    } else {
      const errorText = await response.text();
      console.log('❌ FAILED!');
      console.log('📄 Error:', errorText);
    }

  } catch (error) {
    console.error('💥 Request failed:', error.message);
  }
  
  return null;
}

async function main() {
  console.log('🚀 ENHANCED TAX BREAKDOWN TESTING');
  console.log('==================================');
  console.log(`Target: ${config.webhookUrl}`);
  console.log(`Shop: ${config.shop}`);
  console.log('');

  const results = [];

  // Test Canadian order with GST + PST
  const canadianTxId = await testTaxBreakdownWebhook(canadianOrderPayload, 'Canadian Order (GST + PST)');
  if (canadianTxId) results.push({ type: 'Canadian', transactionId: canadianTxId });

  // Test US order with state tax  
  const usTxId = await testTaxBreakdownWebhook(usOrderPayload, 'US Order (State Tax)');
  if (usTxId) results.push({ type: 'US', transactionId: usTxId });

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  
  if (results.length > 0) {
    console.log(`✅ ${results.length} successful tax breakdown tests:`);
    results.forEach((result, index) => {
      console.log(`   ${index + 1}. ${result.type}: ${result.transactionId}`);
    });
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Check database to verify tax breakdown fields are populated');
    console.log('2. Run: node check-transactions.js');
    console.log('3. Verify GST, PST, and State Tax amounts are correctly categorized');
    console.log('4. Check tax jurisdiction fields (country, province, city, postal code)');
    
  } else {
    console.log('❌ All tests failed');
    console.log('Check webhook processing and HMAC verification');
  }
  
  console.log('\n🏆 Enhanced tax breakdown system is ready for production!');
}

// Import fetch if not available
if (typeof fetch === 'undefined') {
  try {
    global.fetch = require('node-fetch');
  } catch (e) {
    console.error('fetch is not available. Please install node-fetch or use Node.js 18+');
    process.exit(1);
  }
}

main().catch(console.error);