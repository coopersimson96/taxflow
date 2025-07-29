#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

function setupProject() {
  console.log('🚀 Setting up your Tax Analytics application...\n')

  // Check if .env.local exists
  const envPath = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) {
    console.log('📝 Creating .env.local file from example...')
    try {
      fs.copyFileSync('.env.example', '.env.local')
      console.log('✅ .env.local file created!')
      console.log('⚠️  Please update .env.local with your actual API credentials\n')
    } catch (error) {
      console.log('❌ Error creating .env.local file:', error.message)
    }
  } else {
    console.log('✅ .env.local file already exists\n')
  }

  // Display next steps
  console.log('🎉 Setup complete! Next steps:')
  console.log('')
  console.log('1. Update your .env.local file with API credentials:')
  console.log('   - Shopify API credentials')
  console.log('   - Square API credentials')
  console.log('   - Database connection string')
  console.log('')
  console.log('2. Start the development server:')
  console.log('   npm run dev')
  console.log('')
  console.log('3. Open your browser to:')
  console.log('   http://localhost:3000')
  console.log('')
  console.log('📚 Check the README.md for detailed setup instructions')
  console.log('')
  console.log('Happy coding! 🎯')
}

setupProject()