#!/usr/bin/env node

/**
 * Debug Dashboard Component Issues
 * Check if components exist and are properly structured
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 DEBUGGING DASHBOARD COMPONENTS');
console.log('=================================\n');

const componentsDir = './src/components/analytics';
const files = [
  'TaxAnalyticsDashboard.tsx',
  'TaxHeroSection.tsx', 
  'TaxSummaryCards.tsx',
  'TaxBreakdown.tsx',
  'TaxTrendsChart.tsx',
  'OrderBreakdown.tsx'
];

console.log('📁 Checking component files:');
files.forEach(file => {
  const filePath = path.join(componentsDir, file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`✅ ${file} - ${Math.round(stats.size / 1024)}KB`);
  } else {
    console.log(`❌ ${file} - MISSING`);
  }
});

console.log('\n📁 Checking other files:');
const otherFiles = [
  './src/hooks/useTaxDashboard.ts',
  './src/types/tax-dashboard.ts',
  './src/app/api/analytics/tax-dashboard/route.ts',
  './src/app/tax-dashboard/page.tsx'
];

otherFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const stats = fs.statSync(file);
    console.log(`✅ ${file.replace('./', '')} - ${Math.round(stats.size / 1024)}KB`);
  } else {
    console.log(`❌ ${file.replace('./', '')} - MISSING`);
  }
});

// Check package.json for recharts
console.log('\n📦 Checking dependencies:');
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const recharts = packageJson.dependencies?.recharts || packageJson.devDependencies?.recharts;
console.log(`Recharts: ${recharts || '❌ MISSING'}`);

// Simple build test
console.log('\n🔧 Build test suggestions:');
console.log('1. Run: npm run build');
console.log('2. Check for TypeScript errors');
console.log('3. Check Vercel deployment logs');
console.log('4. Try accessing: https://taxflow-smoky.vercel.app/api/analytics/sample-data');