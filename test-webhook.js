#!/usr/bin/env node

/**
 * Test Webhook HMAC Verification
 * This script sends a test webhook payload to verify HMAC verification is working
 */

const crypto = require('crypto');

const config = {
  webhookSecret: 'taxflow_webhook_secret_2025',
  webhookUrl: 'https://taxflow-smoky.vercel.app/api/webhooks/shopify',
  shop: 'taxflow-test'
};

// Sample order create payload
const testPayload = {
  id: 123456789,
  order_number: 1001,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  currency: "USD",
  subtotal_price: "100.00",
  total_tax: "8.25",
  total_price: "108.25",
  total_discounts: "0.00",
  financial_status: "paid",
  fulfillment_status: null,
  customer: {
    id: 987654321,
    email: "test@example.com",
    first_name: "Test",
    last_name: "User"
  },
  billing_address: {
    address1: "123 Test St",
    city: "Test City",
    province: "CA",
    country: "US",
    zip: "90210"
  },
  shipping_address: {
    address1: "123 Test St",
    city: "Test City",
    province: "CA", 
    country: "US",
    zip: "90210"
  },
  tax_lines: [
    {
      title: "CA State Tax",
      price: "8.25",
      rate: 0.0825
    }
  ],
  line_items: [
    {
      id: 111111111,
      product_id: 222222222,
      variant_id: 333333333,
      title: "Test Product",
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

function generateHMAC(payload, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload, 'utf8');
  return hmac.digest('base64');
}

async function testWebhook() {
  console.log('🧪 Testing webhook HMAC verification...');
  console.log(`Webhook URL: ${config.webhookUrl}`);
  console.log(`Shop: ${config.shop}`);
  console.log(`Secret: ${config.webhookSecret}`);
  console.log('');

  const payloadString = JSON.stringify(testPayload);
  const hmacSignature = generateHMAC(payloadString, config.webhookSecret);
  
  console.log('Generated HMAC:', hmacSignature);
  console.log('Payload size:', payloadString.length, 'bytes');
  console.log('');

  const headers = {
    'Content-Type': 'application/json',
    'X-Shopify-Topic': 'orders/create',
    'X-Shopify-Shop-Domain': config.shop + '.myshopify.com',
    'X-Shopify-Hmac-Sha256': hmacSignature,
    'X-Shopify-Order-Id': testPayload.id.toString(),
    'X-Shopify-Test': 'true'
  };

  console.log('Request headers:');
  Object.entries(headers).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });
  console.log('');

  try {
    console.log('📤 Sending test webhook...');
    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: headers,
      body: payloadString
    });

    console.log(`📥 Response status: ${response.status} ${response.statusText}`);
    
    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
      console.log('📄 Response data:', JSON.stringify(responseData, null, 2));
    } catch (e) {
      console.log('📄 Response text:', responseText);
    }

    if (response.ok) {
      console.log('✅ Webhook test SUCCESSFUL! HMAC verification is working.');
      
      if (responseData && responseData.transactionId) {
        console.log(`✅ Transaction created with ID: ${responseData.transactionId}`);
      }
    } else {
      console.log('❌ Webhook test FAILED!');
      if (response.status === 401) {
        console.log('   This likely indicates HMAC verification failed.');
      }
    }

  } catch (error) {
    console.error('💥 Test failed with error:', error.message);
  }
}

// Import fetch if not available (Node.js < 18)
if (typeof fetch === 'undefined') {
  try {
    global.fetch = require('node-fetch');
  } catch (e) {
    console.error('fetch is not available. Please install node-fetch or use Node.js 18+');
    process.exit(1);
  }
}

testWebhook();