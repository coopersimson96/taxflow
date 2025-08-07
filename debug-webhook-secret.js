#!/usr/bin/env node

/**
 * Debug webhook secret mismatch
 * Tests multiple possible secrets to identify what the server is actually using
 */

const crypto = require('crypto');

const possibleSecrets = [
  'taxflow_webhook_secret_2025',     // New secret from .env
  'taxflow2024webhook',              // Previous attempts
  'testwebhook',                     // Default attempts
  'webhook_secret',                  // Common default
  '',                                // Empty string
];

const config = {
  webhookUrl: 'https://taxflow-smoky.vercel.app/api/webhooks/shopify',
  shop: 'taxflow-test'
};

// Sample payload - keeping it small
const testPayload = {
  id: 123456789,
  order_number: 1001,
  created_at: new Date().toISOString(),
  currency: "USD",
  total_price: "100.00",
  total_tax: "8.25",
  customer: { email: "test@example.com" }
};

function generateHMAC(payload, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload, 'utf8');
  return hmac.digest('base64');
}

async function testWithSecret(secret, label) {
  console.log(`\n🧪 Testing with secret: "${label}"`);
  
  const payloadString = JSON.stringify(testPayload);
  const hmacSignature = generateHMAC(payloadString, secret);
  
  console.log(`Generated HMAC: ${hmacSignature.substring(0, 20)}...`);

  const headers = {
    'Content-Type': 'application/json',
    'X-Shopify-Topic': 'orders/create',
    'X-Shopify-Shop-Domain': config.shop + '.myshopify.com',
    'X-Shopify-Hmac-Sha256': hmacSignature,
    'X-Shopify-Order-Id': testPayload.id.toString(),
    'X-Shopify-Test': 'true'
  };

  try {
    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: headers,
      body: payloadString
    });

    const status = response.status;
    console.log(`📥 Response: ${status} ${response.statusText}`);

    if (status === 200) {
      console.log(`✅ SUCCESS! Server is using secret: "${label}"`);
      const responseData = await response.json();
      console.log('Response:', responseData);
      return true;
    } else if (status === 401) {
      console.log(`❌ HMAC mismatch - server not using: "${label}"`);
    } else {
      console.log(`⚠️ Unexpected status: ${status}`);
      const responseText = await response.text();
      console.log('Response:', responseText.substring(0, 200));
    }

  } catch (error) {
    console.error(`💥 Request failed: ${error.message}`);
  }
  
  return false;
}

async function main() {
  console.log('🔍 Debugging webhook secret configuration...');
  console.log(`Webhook URL: ${config.webhookUrl}`);
  console.log(`Testing ${possibleSecrets.length} possible secrets...\n`);

  let foundMatch = false;

  for (let i = 0; i < possibleSecrets.length; i++) {
    const secret = possibleSecrets[i];
    const label = secret || '(empty)';
    
    const success = await testWithSecret(secret, label);
    if (success) {
      foundMatch = true;
      break;
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(50));
  
  if (foundMatch) {
    console.log('✅ Found working webhook secret!');
  } else {
    console.log('❌ No matching webhook secret found.');
    console.log('\nPossible issues:');
    console.log('1. Environment variable not updated on Vercel');
    console.log('2. Deployment not yet propagated');
    console.log('3. Server using a different secret than expected');
    console.log('4. HMAC calculation differs from expected format');
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

main();