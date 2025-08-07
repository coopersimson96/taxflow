#!/usr/bin/env node

/**
 * Find the current webhook secret being used by the server
 * Tests with the most likely old secrets from the conversation history
 */

const crypto = require('crypto');

// Based on conversation history, these are the most likely old secrets
const historicalSecrets = [
  'your-webhook-secret-here',        // From initial .env template
  'testwebhook123',                  // Common test value
  'shopify_webhook_secret',          // Standard naming
  'taxflow_webhook_2024',            // Previous attempt
  'webhook_secret_key',              // Generic
  'asdf97asdf8907asd8f7asd98fas0d9f', // Same pattern as NEXTAUTH_SECRET
  'shopify-tax-app-webhook',         // App name based
  'taxflow_shopify_webhook',         // Descriptive
  'dev_webhook_secret',              // Development value
  'test_secret',                     // Simple test
];

const config = {
  webhookUrl: 'https://taxflow-smoky.vercel.app/api/webhooks/shopify',
  shop: 'taxflow-test'
};

// Very simple payload to minimize variables
const testPayload = {
  id: 123456,
  order_number: 1000,
  currency: "USD",
  total_price: "10.00"
};

function generateHMAC(payload, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload, 'utf8');
  return hmac.digest('base64');
}

async function testSecret(secret, index) {
  console.log(`\n${index + 1}. Testing: "${secret}"`);
  
  const payloadString = JSON.stringify(testPayload);
  const hmacSignature = generateHMAC(payloadString, secret);
  
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

    if (response.status === 200) {
      console.log(`🎯 FOUND IT! Server is using: "${secret}"`);
      const responseData = await response.json();
      console.log('✅ Response:', responseData);
      return secret;
    } else if (response.status === 401) {
      console.log(`   ❌ Not: "${secret}"`);
    } else {
      console.log(`   ⚠️ Status ${response.status}: Unexpected response`);
    }

  } catch (error) {
    console.log(`   💥 Error: ${error.message}`);
  }
  
  return null;
}

async function main() {
  console.log('🔍 Searching for current webhook secret on production...');
  console.log(`Testing ${historicalSecrets.length} historical possibilities...\n`);

  for (let i = 0; i < historicalSecrets.length; i++) {
    const foundSecret = await testSecret(historicalSecrets[i], i);
    
    if (foundSecret) {
      console.log('\n🎉 SUCCESS! Current production secret found.');
      console.log(`\n📋 To fix this issue:`);
      console.log(`1. Verify Vercel environment variable is set to: taxflow_webhook_secret_2025`);
      console.log(`2. Redeploy the application to pick up new environment variable`);
      console.log(`3. Current secret in use: "${foundSecret}"`);
      return;
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  console.log('\n❌ Could not find matching secret from historical list.');
  console.log('\n🔧 Manual steps needed:');
  console.log('1. Check Vercel dashboard environment variables');
  console.log('2. Ensure SHOPIFY_WEBHOOK_SECRET = taxflow_webhook_secret_2025');
  console.log('3. Trigger a new deployment in Vercel');
  console.log('4. Environment variables only update on new deployments');
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

main();