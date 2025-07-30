#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Next.js App Router build...\n');

// Check that the build completed successfully
const buildDir = path.join(__dirname, '..', '.next');
if (!fs.existsSync(buildDir)) {
  console.error('❌ Build directory not found. Run `npm run build` first.');
  process.exit(1);
}

// Check server components
const appDir = path.join(buildDir, 'server', 'app');
const pagesToCheck = [
  'auth/signin/page.js',
  'auth/error/page.js', 
  'connect/page.js'
];

let allGood = true;

pagesToCheck.forEach(pagePath => {
  const fullPath = path.join(appDir, pagePath);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${pagePath} - Built successfully`);
  } else {
    console.log(`❌ ${pagePath} - Missing from build`);
    allGood = false;
  }
});

// Check client components (they get bundled into static chunks)
const staticChunksDir = path.join(buildDir, 'static', 'chunks', 'app');
const clientPages = [
  'auth/signin',
  'auth/error',
  'connect'
];

console.log('\n🔧 Checking client components...');
clientPages.forEach(pagePath => {
  const pageDir = path.join(staticChunksDir, pagePath);
  if (fs.existsSync(pageDir)) {
    const files = fs.readdirSync(pageDir);
    const hasPageJs = files.some(file => file.startsWith('page-') && file.endsWith('.js'));
    if (hasPageJs) {
      console.log(`✅ ${pagePath} - Client bundle created successfully`);
    } else {
      console.log(`❌ ${pagePath} - No client bundle found`);
      allGood = false;
    }
  } else {
    console.log(`❌ ${pagePath} - Directory missing from static chunks`);
    allGood = false;
  }
});

// Check API routes
const apiRoutes = [
  'api/shopify/callback/route.js'
];

console.log('\n🚀 Checking API routes...');
apiRoutes.forEach(routePath => {
  const fullPath = path.join(appDir, routePath);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${routePath} - API route built successfully`);
  } else {
    console.log(`❌ ${routePath} - Missing from build`);
    allGood = false;
  }
});

if (allGood) {
  console.log('\n🎉 Build verification passed! Ready for deployment.');
} else {
  console.log('\n❌ Build verification failed. Check the issues above.');
  process.exit(1);
}