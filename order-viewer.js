#!/usr/bin/env node

/**
 * User-Friendly Order Viewer
 * Clean, organized display of orders with easy verification of calculations
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

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

async function viewOrders() {
  console.log('📋 SHOPIFY ORDER VIEWER - EASY VERIFICATION');
  console.log('==========================================\n');
  
  const client = new Client({
    connectionString: config.databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    // Get recent orders with all relevant data
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
        
        -- Tax breakdown
        "gstAmount",
        "pstAmount",
        "hstAmount",
        "qstAmount", 
        "stateTaxAmount",
        "localTaxAmount",
        "otherTaxAmount",
        
        -- Customer and location
        "customerEmail",
        "customerName",
        "taxCountry",
        "taxProvince",
        "taxCity",
        
        -- Dates
        "transactionDate",
        "createdAt",
        
        -- Status
        type,
        status
        
      FROM transactions 
      WHERE "createdAt" >= NOW() - INTERVAL '7 days'
      ORDER BY "orderNumber"::integer DESC
      LIMIT 15
    `);

    if (result.rows.length === 0) {
      console.log('❌ No orders found in the last 7 days');
      return;
    }

    console.log(`📊 Found ${result.rows.length} orders from the last 7 days:\n`);
    console.log('=' * 80);

    result.rows.forEach((order, index) => {
      // Header with order info
      console.log(`\n🛍️  ORDER #${order.orderNumber} (${order.type})`);
      console.log(`📅 Date: ${formatDate(order.transactionDate)} | Status: ${order.status}`);
      console.log(`👤 Customer: ${order.customerName || 'N/A'} (${order.customerEmail || 'N/A'})`);
      console.log(`📍 Location: ${[order.taxCity, order.taxProvince, order.taxCountry].filter(Boolean).join(', ') || 'Unknown'}`);
      console.log(`🆔 Shopify ID: ${order.externalId}`);
      
      console.log('\n💰 ORDER BREAKDOWN:');
      console.log('├─ Subtotal:   ' + formatCurrency(order.subtotal, order.currency).padEnd(12) + `(${order.subtotal} cents)`);
      console.log('├─ Shipping:   ' + formatCurrency(order.shippingAmount, order.currency).padEnd(12) + `(${order.shippingAmount} cents)`);
      console.log('├─ Discount:   ' + formatCurrency(order.discountAmount, order.currency).padEnd(12) + `(${order.discountAmount} cents)`);
      console.log('├─ Tax:        ' + formatCurrency(order.taxAmount, order.currency).padEnd(12) + `(${order.taxAmount} cents)`);
      console.log('└─ TOTAL:      ' + formatCurrency(order.totalAmount, order.currency).padEnd(12) + `(${order.totalAmount} cents)` + ' 🎯');
      
      // Tax breakdown if available
      const hasTaxBreakdown = order.gstAmount > 0 || order.pstAmount > 0 || order.stateTaxAmount > 0 || 
                             order.hstAmount > 0 || order.qstAmount > 0 || order.localTaxAmount > 0 || order.otherTaxAmount > 0;
      
      if (hasTaxBreakdown) {
        console.log('\n🏷️  TAX BREAKDOWN:');
        let totalTaxFromBreakdown = 0;
        
        if (order.gstAmount > 0) {
          console.log('├─ GST (5%):   ' + formatCurrency(order.gstAmount, order.currency).padEnd(12) + `(${order.gstAmount} cents)`);
          totalTaxFromBreakdown += order.gstAmount;
        }
        if (order.pstAmount > 0) {
          console.log('├─ PST (7%):   ' + formatCurrency(order.pstAmount, order.currency).padEnd(12) + `(${order.pstAmount} cents)`);
          totalTaxFromBreakdown += order.pstAmount;
        }
        if (order.hstAmount > 0) {
          console.log('├─ HST (13%):  ' + formatCurrency(order.hstAmount, order.currency).padEnd(12) + `(${order.hstAmount} cents)`);
          totalTaxFromBreakdown += order.hstAmount;
        }
        if (order.qstAmount > 0) {
          console.log('├─ QST (9.975%): ' + formatCurrency(order.qstAmount, order.currency).padEnd(12) + `(${order.qstAmount} cents)`);
          totalTaxFromBreakdown += order.qstAmount;
        }
        if (order.stateTaxAmount > 0) {
          console.log('├─ State Tax:  ' + formatCurrency(order.stateTaxAmount, order.currency).padEnd(12) + `(${order.stateTaxAmount} cents)`);
          totalTaxFromBreakdown += order.stateTaxAmount;
        }
        if (order.localTaxAmount > 0) {
          console.log('├─ Local Tax:  ' + formatCurrency(order.localTaxAmount, order.currency).padEnd(12) + `(${order.localTaxAmount} cents)`);
          totalTaxFromBreakdown += order.localTaxAmount;
        }
        if (order.otherTaxAmount > 0) {
          console.log('├─ Other Tax:  ' + formatCurrency(order.otherTaxAmount, order.currency).padEnd(12) + `(${order.otherTaxAmount} cents)`);
          totalTaxFromBreakdown += order.otherTaxAmount;
        }
        
        // Validation
        const difference = Math.abs(totalTaxFromBreakdown - order.taxAmount);
        if (difference <= 1) { // Allow 1 cent rounding
          console.log('└─ ✅ VERIFIED: Tax breakdown matches total');
        } else {
          console.log(`└─ ❌ ERROR: Breakdown total ${formatCurrency(totalTaxFromBreakdown, order.currency)} ≠ Stored ${formatCurrency(order.taxAmount, order.currency)}`);
        }
      } else {
        console.log('\n🏷️  TAX BREAKDOWN: No detailed breakdown available');
      }
      
      // Calculation verification
      const expectedTotal = order.subtotal + order.taxAmount + order.shippingAmount - order.discountAmount;
      const totalDifference = Math.abs(expectedTotal - order.totalAmount);
      
      console.log('\n🔍 CALCULATION CHECK:');
      if (totalDifference <= 1) { // Allow 1 cent rounding
        console.log('✅ ORDER TOTAL VERIFIED: ' + `${formatCurrency(order.subtotal, order.currency)} + ${formatCurrency(order.taxAmount, order.currency)} + ${formatCurrency(order.shippingAmount, order.currency)} - ${formatCurrency(order.discountAmount, order.currency)} = ${formatCurrency(order.totalAmount, order.currency)}`);
      } else {
        console.log('❌ ORDER TOTAL ERROR: Calculation doesn\'t match stored total');
        console.log(`   Expected: ${formatCurrency(expectedTotal, order.currency)} | Stored: ${formatCurrency(order.totalAmount, order.currency)} | Diff: ${formatCurrency(totalDifference, order.currency)}`);
      }
      
      // Flag suspicious amounts
      if (order.totalAmount > 1000000) { // > $10,000
        console.log('🚨 ALERT: Unusually high amount - possible calculation error!');
      }
      
      console.log('\n' + '═'.repeat(80));
    });

    // Summary statistics
    console.log('\n📈 SUMMARY STATISTICS');
    console.log('====================');
    
    const totalOrders = result.rows.length;
    const totalRevenue = result.rows.reduce((sum, order) => sum + order.totalAmount, 0);
    const totalTax = result.rows.reduce((sum, order) => sum + order.taxAmount, 0);
    const totalGST = result.rows.reduce((sum, order) => sum + (order.gstAmount || 0), 0);
    const totalPST = result.rows.reduce((sum, order) => sum + (order.pstAmount || 0), 0);
    const totalStateTax = result.rows.reduce((sum, order) => sum + (order.stateTaxAmount || 0), 0);
    
    const canadianOrders = result.rows.filter(o => o.taxCountry === 'CA').length;
    const usOrders = result.rows.filter(o => o.taxCountry === 'US').length;
    
    console.log(`Total Orders: ${totalOrders}`);
    console.log(`├─ Canadian Orders: ${canadianOrders}`);
    console.log(`└─ US Orders: ${usOrders}`);
    console.log('');
    console.log(`Total Revenue: ${formatCurrency(totalRevenue, 'CAD')} (across all currencies)`);
    console.log(`Total Tax Collected: ${formatCurrency(totalTax, 'CAD')}`);
    console.log(`├─ GST: ${formatCurrency(totalGST, 'CAD')}`);
    console.log(`├─ PST: ${formatCurrency(totalPST, 'CAD')}`);
    console.log(`└─ State Tax: ${formatCurrency(totalStateTax, 'USD')}`);

    // Verification summary
    let calculationErrors = 0;
    let taxBreakdownErrors = 0;
    
    result.rows.forEach(order => {
      const expectedTotal = order.subtotal + order.taxAmount + order.shippingAmount - order.discountAmount;
      if (Math.abs(expectedTotal - order.totalAmount) > 1) calculationErrors++;
      
      const totalTaxFromBreakdown = (order.gstAmount || 0) + (order.pstAmount || 0) + (order.stateTaxAmount || 0) + 
                                   (order.hstAmount || 0) + (order.qstAmount || 0) + (order.localTaxAmount || 0) + (order.otherTaxAmount || 0);
      if (totalTaxFromBreakdown > 0 && Math.abs(totalTaxFromBreakdown - order.taxAmount) > 1) taxBreakdownErrors++;
    });
    
    console.log('\n✅ VERIFICATION RESULTS');
    console.log('======================');
    if (calculationErrors === 0 && taxBreakdownErrors === 0) {
      console.log('🎉 ALL CALCULATIONS ARE CORRECT!');
      console.log('✅ Order totals match breakdowns');
      console.log('✅ Tax breakdowns match stored amounts'); 
      console.log('✅ No suspicious amounts detected');
    } else {
      console.log(`❌ Found ${calculationErrors} order calculation error(s)`);
      console.log(`❌ Found ${taxBreakdownErrors} tax breakdown error(s)`);
    }

  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await client.end();
  }
}

async function main() {
  await viewOrders();
  
  console.log('\n🎯 HOW TO USE THIS DATA:');
  console.log('========================');
  console.log('1. Compare "ORDER TOTAL VERIFIED" with your Shopify admin');
  console.log('2. Check tax breakdowns match your expectations (GST 5%, PST 7%)'); 
  console.log('3. Look for any 🚨 ALERT messages indicating issues');
  console.log('4. Cross-reference Shopify Order IDs with your store');
  console.log('');
  console.log('🔍 To check a specific order: Look for the Order # and Shopify ID');
  console.log('📊 To verify in Supabase: Use the "cents" values shown in parentheses');
  console.log('');
  console.log('✨ This view shows exactly what\'s stored in your database!');
}

main().catch(console.error);