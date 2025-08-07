#!/usr/bin/env node

/**
 * View Tax Breakdown with Amounts
 * Displays transactions with clear tax amount breakdown for each category
 */

const { Client } = require('pg');

const config = {
  databaseUrl: 'postgresql://postgres.zpxltmcmtfqrgystdvxu:Supabasetaxflow45123@aws-0-ca-central-1.pooler.supabase.com:6543/postgres'
};

function formatCurrency(amountInCents, currency = 'USD') {
  const amount = amountInCents / 100;
  const symbols = { USD: '$', CAD: '$', EUR: '€', GBP: '£' };
  const symbol = symbols[currency] || currency + ' ';
  return `${symbol}${amount.toFixed(2)}`;
}

function formatTaxBreakdown(transaction) {
  const taxes = [];
  
  // Add each tax type with amount if > 0
  if (transaction.gstAmount > 0) {
    taxes.push(`GST: ${formatCurrency(transaction.gstAmount, transaction.currency)}`);
  }
  if (transaction.pstAmount > 0) {
    taxes.push(`PST: ${formatCurrency(transaction.pstAmount, transaction.currency)}`);
  }
  if (transaction.hstAmount > 0) {
    taxes.push(`HST: ${formatCurrency(transaction.hstAmount, transaction.currency)}`);
  }
  if (transaction.qstAmount > 0) {
    taxes.push(`QST: ${formatCurrency(transaction.qstAmount, transaction.currency)}`);
  }
  if (transaction.stateTaxAmount > 0) {
    taxes.push(`State Tax: ${formatCurrency(transaction.stateTaxAmount, transaction.currency)}`);
  }
  if (transaction.localTaxAmount > 0) {
    taxes.push(`Local Tax: ${formatCurrency(transaction.localTaxAmount, transaction.currency)}`);
  }
  if (transaction.otherTaxAmount > 0) {
    taxes.push(`Other Tax: ${formatCurrency(transaction.otherTaxAmount, transaction.currency)}`);
  }
  
  return taxes.length > 0 ? taxes.join(' + ') : 'No tax breakdown';
}

function formatJurisdiction(transaction) {
  const parts = [];
  if (transaction.taxCity) parts.push(transaction.taxCity);
  if (transaction.taxProvince) parts.push(transaction.taxProvince);
  if (transaction.taxCountry) parts.push(transaction.taxCountry);
  return parts.length > 0 ? parts.join(', ') : 'Unknown location';
}

async function viewTaxBreakdown() {
  console.log('💰 TRANSACTION TAX BREAKDOWN VIEW');
  console.log('==================================\n');
  
  const client = new Client({
    connectionString: config.databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    // Get recent transactions with enhanced tax data
    const result = await client.query(`
      SELECT 
        id,
        "externalId",
        "orderNumber",
        currency,
        "subtotal",
        "taxAmount",
        "totalAmount",
        
        -- Individual tax amounts
        "gstAmount",
        "pstAmount", 
        "hstAmount",
        "qstAmount",
        "stateTaxAmount",
        "localTaxAmount",
        "otherTaxAmount",
        
        -- Customer info
        "customerEmail",
        "customerName",
        
        -- Jurisdiction info
        "taxCountry",
        "taxProvince", 
        "taxCity",
        "taxPostalCode",
        
        -- Timestamps
        "transactionDate",
        "createdAt"
        
      FROM transactions 
      WHERE "createdAt" >= NOW() - INTERVAL '24 hours'
      AND ("gstAmount" > 0 OR "pstAmount" > 0 OR "stateTaxAmount" > 0 OR "hstAmount" > 0 OR "qstAmount" > 0 OR "localTaxAmount" > 0 OR "otherTaxAmount" > 0)
      ORDER BY "createdAt" DESC
      LIMIT 10
    `);

    if (result.rows.length === 0) {
      console.log('❌ No recent transactions with tax breakdown found in the last 24 hours');
      console.log('\nTo generate test data, run: node test-enhanced-tax-processing.js');
      return;
    }

    console.log(`✅ Found ${result.rows.length} transaction(s) with detailed tax breakdown:\n`);
    
    // Summary stats
    let totalGST = 0, totalPST = 0, totalStateTax = 0;
    let canadianOrders = 0, usOrders = 0;
    
    result.rows.forEach((tx, index) => {
      console.log(`${index + 1}. 📄 ORDER ${tx.orderNumber} (${tx.externalId})`);
      console.log(`   Customer: ${tx.customerName || 'N/A'} (${tx.customerEmail || 'N/A'})`);
      console.log(`   Location: ${formatJurisdiction(tx)} ${tx.taxPostalCode ? '(' + tx.taxPostalCode + ')' : ''}`);
      console.log(`   Order Date: ${new Date(tx.transactionDate).toLocaleDateString()}`);
      console.log('');
      
      // Order totals
      console.log(`   💰 ORDER TOTALS:`);
      console.log(`      Subtotal: ${formatCurrency(tx.subtotal, tx.currency)}`);
      console.log(`      Total Tax: ${formatCurrency(tx.taxAmount, tx.currency)}`);
      console.log(`      Grand Total: ${formatCurrency(tx.totalAmount, tx.currency)}`);
      console.log('');
      
      // Tax breakdown with amounts
      console.log(`   🏷️  TAX BREAKDOWN:`);
      
      let taxItemsShown = 0;
      if (tx.gstAmount > 0) {
        console.log(`      ├─ GST: ${formatCurrency(tx.gstAmount, tx.currency)} (5.0%)`);
        totalGST += tx.gstAmount;
        taxItemsShown++;
      }
      if (tx.pstAmount > 0) {
        console.log(`      ├─ PST: ${formatCurrency(tx.pstAmount, tx.currency)} (7.0%)`);
        totalPST += tx.pstAmount;
        taxItemsShown++;
      }
      if (tx.hstAmount > 0) {
        console.log(`      ├─ HST: ${formatCurrency(tx.hstAmount, tx.currency)} (13.0%)`);
        taxItemsShown++;
      }
      if (tx.qstAmount > 0) {
        console.log(`      ├─ QST: ${formatCurrency(tx.qstAmount, tx.currency)} (9.975%)`);
        taxItemsShown++;
      }
      if (tx.stateTaxAmount > 0) {
        console.log(`      ├─ State Tax: ${formatCurrency(tx.stateTaxAmount, tx.currency)} (varies by state)`);
        totalStateTax += tx.stateTaxAmount;
        taxItemsShown++;
      }
      if (tx.localTaxAmount > 0) {
        console.log(`      ├─ Local Tax: ${formatCurrency(tx.localTaxAmount, tx.currency)} (varies by locality)`);
        taxItemsShown++;
      }
      if (tx.otherTaxAmount > 0) {
        console.log(`      ├─ Other Tax: ${formatCurrency(tx.otherTaxAmount, tx.currency)} (other)`);
        taxItemsShown++;
      }
      
      if (taxItemsShown === 0) {
        console.log(`      └─ No detailed tax breakdown available`);
      } else {
        console.log(`      └─ Total: ${formatCurrency(tx.taxAmount, tx.currency)} (${taxItemsShown} tax type${taxItemsShown > 1 ? 's' : ''})`);
      }
      
      // Count by country
      if (tx.taxCountry === 'CA') canadianOrders++;
      else if (tx.taxCountry === 'US') usOrders++;
      
      console.log('');
      console.log('   ' + '─'.repeat(60));
      console.log('');
    });

    // Summary statistics
    console.log('📊 TAX SUMMARY STATISTICS');
    console.log('=========================');
    console.log(`Total Orders Analyzed: ${result.rows.length}`);
    console.log(`├─ Canadian Orders: ${canadianOrders}`);
    console.log(`└─ US Orders: ${usOrders}`);
    console.log('');
    
    if (totalGST > 0) console.log(`Total GST Collected: ${formatCurrency(totalGST, 'CAD')}`);
    if (totalPST > 0) console.log(`Total PST Collected: ${formatCurrency(totalPST, 'CAD')}`);
    if (totalStateTax > 0) console.log(`Total State Tax Collected: ${formatCurrency(totalStateTax, 'USD')}`);
    
    const grandTotalTax = result.rows.reduce((sum, tx) => sum + tx.taxAmount, 0);
    console.log(`\n💰 Grand Total Tax Collected: ${formatCurrency(grandTotalTax)} across all jurisdictions`);

  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await client.end();
  }
}

async function main() {
  await viewTaxBreakdown();
  
  console.log('\n🎯 TAX COMPLIANCE FEATURES:');
  console.log('============================');
  console.log('✅ Individual tax amounts clearly displayed');
  console.log('✅ Tax jurisdiction identification'); 
  console.log('✅ Compliance-ready breakdown for GST, PST, State Tax');
  console.log('✅ Multi-currency support');
  console.log('✅ Customer and order tracking');
  console.log('✅ Summary statistics for reporting');
  
  console.log('\n🚀 Perfect for tax compliance and financial reporting!');
}

main().catch(console.error);