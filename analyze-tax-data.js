#!/usr/bin/env node

/**
 * Analyze Tax Data Structure
 * Examines current tax data from recent transactions to design enhanced schema
 */

const { Client } = require('pg');

const config = {
  databaseUrl: 'postgresql://postgres.zpxltmcmtfqrgystdvxu:Supabasetaxflow45123@aws-0-ca-central-1.pooler.supabase.com:6543/postgres'
};

async function analyzeTaxData() {
  console.log('🔍 Analyzing current tax data structure...\n');
  
  const client = new Client({
    connectionString: config.databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    // Get recent transactions with tax details
    const result = await client.query(`
      SELECT 
        id,
        "externalId",
        "orderNumber",
        "taxAmount",
        "taxDetails",
        "billingAddress",
        "shippingAddress",
        metadata
      FROM transactions 
      WHERE "taxDetails" IS NOT NULL 
      AND "createdAt" >= NOW() - INTERVAL '48 hours'
      ORDER BY "createdAt" DESC
      LIMIT 5
    `);

    if (result.rows.length === 0) {
      console.log('❌ No recent transactions with tax details found');
      return;
    }

    console.log(`✅ Found ${result.rows.length} transactions with tax data:\n`);
    
    result.rows.forEach((transaction, index) => {
      console.log(`${index + 1}. Order ${transaction.orderNumber} (${transaction.externalId}):`);
      console.log(`   Total Tax Amount: $${(transaction.taxAmount / 100).toFixed(2)}`);
      
      if (transaction.billingAddress) {
        const billing = transaction.billingAddress;
        console.log(`   Billing Location: ${billing.city}, ${billing.province}, ${billing.country}`);
      }
      
      if (transaction.taxDetails && Array.isArray(transaction.taxDetails)) {
        console.log(`   Tax Breakdown (${transaction.taxDetails.length} line(s)):`);
        
        transaction.taxDetails.forEach((taxLine, taxIndex) => {
          console.log(`     ${taxIndex + 1}. ${taxLine.title}: $${parseFloat(taxLine.price || 0).toFixed(2)} (${(parseFloat(taxLine.rate || 0) * 100).toFixed(2)}%)`);
          
          // Log the complete tax line structure for analysis
          console.log(`        Raw data:`, JSON.stringify(taxLine, null, 8));
        });
      } else {
        console.log('   ⚠️ No detailed tax breakdown available');
      }
      
      console.log('');
    });

    // Analyze tax line patterns
    console.log('📊 TAX LINE ANALYSIS:');
    console.log('===================');
    
    const allTaxLines = [];
    result.rows.forEach(transaction => {
      if (transaction.taxDetails && Array.isArray(transaction.taxDetails)) {
        allTaxLines.push(...transaction.taxDetails);
      }
    });

    if (allTaxLines.length > 0) {
      console.log(`Total tax lines analyzed: ${allTaxLines.length}`);
      
      // Get unique tax titles
      const taxTitles = [...new Set(allTaxLines.map(tax => tax.title))];
      console.log(`\nUnique tax types found:`);
      taxTitles.forEach(title => {
        const count = allTaxLines.filter(tax => tax.title === title).length;
        const avgRate = allTaxLines
          .filter(tax => tax.title === title)
          .reduce((sum, tax) => sum + (parseFloat(tax.rate || 0) * 100), 0) / count;
        
        console.log(`  - ${title}: ${count} occurrences, avg rate: ${avgRate.toFixed(2)}%`);
      });

      // Sample tax line structure
      console.log(`\n📋 Sample Tax Line Structure:`);
      console.log(JSON.stringify(allTaxLines[0], null, 2));
    }

  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await client.end();
  }
}

async function main() {
  console.log('📊 TAX DATA STRUCTURE ANALYSIS');
  console.log('===============================');
  await analyzeTaxData();
  
  console.log('\n🎯 NEXT STEPS:');
  console.log('1. Review tax line structure above');
  console.log('2. Design enhanced schema based on findings');
  console.log('3. Create migration to add tax breakdown fields');
  console.log('4. Update webhook processing logic');
}

main().catch(console.error);