#!/usr/bin/env node

/**
 * Webhook Cleanup Script for Shopify
 * This script directly cleans all existing webhooks and recreates them with the new secret
 */

const { Client } = require('pg');

const config = {
  shop: 'taxflow-test',
  shopifyApiKey: process.env.SHOPIFY_API_KEY || 'd5aad200f787294ce2c49ebe539bd2d2',
  shopifyApiSecret: process.env.SHOPIFY_API_SECRET || '2051c9d0aa814281de958f28ef102372',
  webhookSecret: process.env.SHOPIFY_WEBHOOK_SECRET || 'taxflow_webhook_secret_2025',
  baseUrl: process.env.NEXTAUTH_URL || 'https://taxflow-smoky.vercel.app',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres.zpxltmcmtfqrgystdvxu:Supabasetaxflow45123@aws-0-ca-central-1.pooler.supabase.com:6543/postgres'
};

const API_VERSION = '2024-01';
const WEBHOOK_TOPICS = [
  'orders/create',
  'orders/updated', 
  'orders/cancelled',
  'refunds/create',
  'app/uninstalled'
];

async function makeShopifyRequest(endpoint, method = 'GET', body = null, accessToken) {
  const url = `https://${config.shop}.myshopify.com/admin/api/${API_VERSION}/${endpoint}`;
  
  const options = {
    method,
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  console.log(`Making ${method} request to: ${url}`);
  const response = await fetch(url, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Shopify API request failed: ${response.status} ${errorText}`);
  }
  
  return response.json();
}

async function getAccessToken() {
  console.log('🔍 Getting access token from database...');
  
  const client = new Client({
    connectionString: config.databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  
  const result = await client.query(`
    SELECT id, credentials 
    FROM integrations 
    WHERE type = 'SHOPIFY' 
    AND status = 'CONNECTED' 
    AND credentials->>'shop' = $1
  `, [config.shop]);
  
  await client.end();

  if (result.rows.length === 0) {
    throw new Error(`No connected integration found for ${config.shop}`);
  }

  const credentials = result.rows[0].credentials;
  const accessToken = credentials.accessToken;

  if (!accessToken) {
    throw new Error('No access token found in integration');
  }

  console.log('✅ Access token found');
  return accessToken;
}

async function listWebhooks(accessToken) {
  console.log('📋 Listing existing webhooks...');
  const result = await makeShopifyRequest('webhooks.json', 'GET', null, accessToken);
  const webhooks = result.webhooks || [];
  
  console.log(`Found ${webhooks.length} existing webhooks:`);
  webhooks.forEach(webhook => {
    console.log(`  - ${webhook.topic}: ${webhook.address} (ID: ${webhook.id})`);
  });
  
  return webhooks;
}

async function deleteWebhook(webhookId, accessToken) {
  console.log(`🗑️ Deleting webhook ${webhookId}...`);
  await makeShopifyRequest(`webhooks/${webhookId}.json`, 'DELETE', null, accessToken);
  console.log(`✅ Deleted webhook ${webhookId}`);
}

async function createWebhook(topic, address, accessToken) {
  console.log(`📤 Creating webhook for ${topic}...`);
  const webhook = {
    webhook: {
      topic,
      address,
      format: 'json'
    }
  };

  const result = await makeShopifyRequest('webhooks.json', 'POST', webhook, accessToken);
  console.log(`✅ Created webhook for ${topic} (ID: ${result.webhook.id})`);
  return result.webhook;
}

async function main() {
  console.log('🚀 Starting webhook cleanup and recreation...');
  console.log('Configuration:');
  console.log(`  Shop: ${config.shop}`);
  console.log(`  Base URL: ${config.baseUrl}`);
  console.log(`  Webhook Secret: ${config.webhookSecret}`);
  console.log('');

  try {
    // Step 1: Get access token
    const accessToken = await getAccessToken();
    
    // Step 2: List existing webhooks
    const existingWebhooks = await listWebhooks(accessToken);
    
    // Step 3: Delete ALL existing webhooks
    console.log('🧹 Deleting all existing webhooks...');
    for (const webhook of existingWebhooks) {
      try {
        await deleteWebhook(webhook.id, accessToken);
      } catch (error) {
        console.error(`❌ Failed to delete webhook ${webhook.id}:`, error.message);
      }
    }
    
    // Step 4: Wait 5 seconds for deletions to propagate
    console.log('⏳ Waiting 5 seconds for deletions to propagate...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Step 5: Create new webhooks
    const webhookEndpoint = `${config.baseUrl}/api/webhooks/shopify`;
    console.log(`📤 Creating new webhooks pointing to: ${webhookEndpoint}`);
    
    const createdWebhooks = [];
    const errors = [];
    
    for (const topic of WEBHOOK_TOPICS) {
      try {
        const webhook = await createWebhook(topic, webhookEndpoint, accessToken);
        createdWebhooks.push(webhook);
      } catch (error) {
        console.error(`❌ Failed to create webhook for ${topic}:`, error.message);
        errors.push({ topic, error: error.message });
      }
    }
    
    // Step 6: Summary
    console.log('');
    console.log('🎉 Webhook cleanup completed!');
    console.log(`✅ Deleted: ${existingWebhooks.length} old webhooks`);
    console.log(`✅ Created: ${createdWebhooks.length} new webhooks`);
    if (errors.length > 0) {
      console.log(`❌ Errors: ${errors.length}`);
      errors.forEach(error => {
        console.log(`  - ${error.topic}: ${error.error}`);
      });
    }
    
    // Step 7: Test webhook endpoint
    console.log('');
    console.log('🧪 Testing webhook endpoint...');
    try {
      const response = await fetch(webhookEndpoint);
      const data = await response.json();
      console.log('✅ Webhook endpoint is accessible:', data.status);
    } catch (error) {
      console.error('❌ Webhook endpoint test failed:', error.message);
    }
    
    console.log('');
    console.log('🎯 Next steps:');
    console.log('1. Place a test order in your Shopify store');
    console.log('2. Check the webhook logs to ensure HMAC verification passes');
    console.log('3. Verify transaction data is being stored correctly');
    
  } catch (error) {
    console.error('💥 Cleanup script failed:', error.message);
    process.exit(1);
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