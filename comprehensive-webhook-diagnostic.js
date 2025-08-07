#!/usr/bin/env node

/**
 * Comprehensive Webhook Diagnostic Tool
 * Identifies the root cause of persistent 401 webhook errors
 */

const crypto = require('crypto');
const { Client } = require('pg');

const config = {
  shop: 'taxflow-test',
  webhookUrl: 'https://taxflow-smoky.vercel.app/api/webhooks/shopify',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres.zpxltmcmtfqrgystdvxu:Supabasetaxflow45123@aws-0-ca-central-1.pooler.supabase.com:6543/postgres',
  expectedSecret: 'taxflow_webhook_secret_2025'
};

// Test multiple possible secrets based on conversation history and common patterns
const possibleSecrets = [
  'taxflow_webhook_secret_2025',     // Current expected
  'your-webhook-secret-here',        // From template
  'testwebhook',                     // Simple test
  'webhook_secret',                  // Generic
  'shopify_webhook_secret',          // Descriptive
  'taxflow2024',                     // Variation
  'asdf97asdf8907asd8f7asd98fas0d9f', // Same as NEXTAUTH_SECRET
  '',                                // Empty
  undefined,                         // Undefined case
];

async function makeShopifyRequest(endpoint, accessToken, method = 'GET') {
  const url = `https://${config.shop}.myshopify.com/admin/api/2024-01/${endpoint}`;
  
  const response = await fetch(url, {
    method,
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Shopify API error: ${response.status}`);
  }
  
  return response.json();
}

async function getAccessToken() {
  const client = new Client({
    connectionString: config.databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  
  const result = await client.query(`
    SELECT credentials 
    FROM integrations 
    WHERE type = 'SHOPIFY' 
    AND status = 'CONNECTED' 
    AND credentials->>'shop' = $1
  `, [config.shop]);
  
  await client.end();

  if (result.rows.length === 0) {
    throw new Error(`No integration found for ${config.shop}`);
  }

  return result.rows[0].credentials.accessToken;
}

function generateHMAC(payload, secret) {
  if (!secret) return 'NO_SECRET';
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload, 'utf8');
  return hmac.digest('base64');
}

async function testWebhookWithSecret(secret, label) {
  const testPayload = {
    id: Date.now(),
    order_number: Math.floor(Math.random() * 1000) + 2000,
    created_at: new Date().toISOString(),
    currency: "USD",
    total_price: "10.99"
  };

  const payloadString = JSON.stringify(testPayload);
  const hmacSignature = generateHMAC(payloadString, secret);
  
  const headers = {
    'Content-Type': 'application/json',
    'X-Shopify-Topic': 'orders/create',
    'X-Shopify-Shop-Domain': config.shop + '.myshopify.com',
    'X-Shopify-Hmac-Sha256': hmacSignature,
    'X-Shopify-Order-Id': testPayload.id.toString(),
    'X-Shopify-Test': 'diagnostic'
  };

  try {
    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: headers,
      body: payloadString
    });

    return {
      secret: secret || '(empty)',
      label,
      status: response.status,
      success: response.status === 200,
      response: response.status === 200 ? await response.json() : await response.text()
    };

  } catch (error) {
    return {
      secret: secret || '(empty)',
      label,
      status: 'ERROR',
      success: false,
      response: error.message
    };
  }
}

async function checkShopifyWebhookConfig() {
  try {
    console.log('🔍 Checking Shopify webhook configuration...');
    const accessToken = await getAccessToken();
    const webhooksData = await makeShopifyRequest('webhooks.json', accessToken);
    
    console.log(`\nFound ${webhooksData.webhooks.length} webhooks in Shopify:`);
    webhooksData.webhooks.forEach((webhook, index) => {
      console.log(`${index + 1}. Topic: ${webhook.topic}`);
      console.log(`   ID: ${webhook.id}`);
      console.log(`   URL: ${webhook.address}`);
      console.log(`   Format: ${webhook.format}`);
      console.log(`   Created: ${webhook.created_at}`);
      console.log(`   Updated: ${webhook.updated_at}`);
      console.log('');
    });

    return webhooksData.webhooks;
  } catch (error) {
    console.error('❌ Failed to check Shopify webhooks:', error.message);
    return [];
  }
}

async function main() {
  console.log('🚨 COMPREHENSIVE WEBHOOK DIAGNOSTIC');
  console.log('=====================================');
  console.log(`Target: ${config.webhookUrl}`);
  console.log(`Shop: ${config.shop}`);
  console.log(`Expected Secret: ${config.expectedSecret}`);
  console.log('');

  // Step 1: Check Shopify webhook configuration
  const webhooks = await checkShopifyWebhookConfig();
  
  // Step 2: Test with multiple possible secrets
  console.log('🧪 Testing webhook endpoint with various secrets...\n');
  
  const results = [];
  
  for (let i = 0; i < possibleSecrets.length; i++) {
    const secret = possibleSecrets[i];
    const label = secret || '(empty)';
    
    console.log(`${i + 1}/${possibleSecrets.length} Testing: "${label}"`);
    const result = await testWebhookWithSecret(secret, label);
    results.push(result);
    
    if (result.success) {
      console.log(`   ✅ SUCCESS! Server accepts this secret`);
      console.log(`   Response:`, result.response);
    } else {
      console.log(`   ❌ Status: ${result.status}`);
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Step 3: Analysis and recommendations
  console.log('\n' + '='.repeat(60));
  console.log('📊 DIAGNOSTIC RESULTS');
  console.log('='.repeat(60));

  const workingSecrets = results.filter(r => r.success);
  const failingSecrets = results.filter(r => !r.success);

  if (workingSecrets.length > 0) {
    console.log(`✅ Found ${workingSecrets.length} working secret(s):`);
    workingSecrets.forEach(result => {
      console.log(`   - "${result.label}"`);
    });
  } else {
    console.log('❌ No working secrets found');
  }

  console.log(`\n❌ ${failingSecrets.length} secrets failed`);

  // Step 4: Root cause analysis
  console.log('\n🔍 ROOT CAUSE ANALYSIS:');
  
  if (workingSecrets.length === 0) {
    console.log('❌ CRITICAL: Server is not accepting any of the tested secrets');
    console.log('\nPossible causes:');
    console.log('1. Environment variable SHOPIFY_WEBHOOK_SECRET not set correctly on Vercel');
    console.log('2. Deployment hasn\'t picked up the new environment variable');
    console.log('3. Server is using a completely different secret not in our test list');
    console.log('4. HMAC verification logic has a bug');
    
    console.log('\n🔧 RECOMMENDED FIXES:');
    console.log('1. Check Vercel dashboard → Project Settings → Environment Variables');
    console.log('2. Redeploy the application to force environment variable refresh');
    console.log('3. Add temporary logging to show what secret the server is using');
    
  } else if (workingSecrets[0].label !== config.expectedSecret) {
    console.log('⚠️ WARNING: Server is using a different secret than expected');
    console.log(`Expected: "${config.expectedSecret}"`);
    console.log(`Actual: "${workingSecrets[0].label}"`);
    
    console.log('\n🔧 RECOMMENDED FIXES:');
    console.log('1. Update Shopify webhook secret to match server expectation');
    console.log('2. Or update server environment variable to match expected secret');
  } else {
    console.log('✅ Server is correctly configured with expected secret');
    console.log('🤔 The 401 errors might be from old webhook retries or different sources');
  }

  // Step 5: Webhook endpoint analysis
  if (webhooks.length > 0) {
    console.log('\n📋 WEBHOOK ENDPOINT ANALYSIS:');
    const correctEndpoint = config.webhookUrl;
    const wrongEndpoints = webhooks.filter(w => w.address !== correctEndpoint);
    
    if (wrongEndpoints.length > 0) {
      console.log(`❌ Found ${wrongEndpoints.length} webhooks pointing to wrong endpoints:`);
      wrongEndpoints.forEach(w => {
        console.log(`   - ${w.topic}: ${w.address}`);
      });
      console.log('\n🔧 These should point to:', correctEndpoint);
    } else {
      console.log('✅ All webhooks point to the correct endpoint');
    }
  }

  console.log('\n🎯 NEXT STEPS:');
  console.log('1. Review the analysis above');
  console.log('2. Apply the recommended fixes');
  console.log('3. Monitor webhook logs for improvement');
  console.log('4. Run this diagnostic again after fixes');
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