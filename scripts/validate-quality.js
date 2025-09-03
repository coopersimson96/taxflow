#!/usr/bin/env node

/**
 * Comprehensive Quality Validation Script
 * Runs all quality checks before commits/deployments
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// ANSI color codes for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function runCommand(command, description) {
  try {
    log(`\n🔍 ${description}`, 'blue')
    const output = execSync(command, { 
      encoding: 'utf8', 
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 120000 // 2 minute timeout
    })
    log(`✅ ${description} - PASSED`, 'green')
    return { success: true, output }
  } catch (error) {
    log(`❌ ${description} - FAILED`, 'red')
    log(error.stdout || error.message, 'red')
    return { success: false, error: error.stdout || error.message }
  }
}

function checkFileExists(filePath, description) {
  const exists = fs.existsSync(filePath)
  if (exists) {
    log(`✅ ${description} - EXISTS`, 'green')
  } else {
    log(`❌ ${description} - MISSING`, 'red')
  }
  return exists
}

function scanForSecurityIssues() {
  log('\n🔒 Security Scan', 'blue')
  
  const issues = []
  
  // Check for exposed secrets
  const secretPatterns = [
    /sk_live_/g, // Stripe live keys
    /sk_test_/g, // Stripe test keys  
    /AIza[0-9A-Za-z\\-_]{35}/g, // Google API keys
    /ya29\\.[0-9A-Za-z\\-_]+/g, // Google OAuth tokens
    /github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59}/g, // GitHub tokens
    /ghp_[a-zA-Z0-9]{36}/g, // GitHub personal tokens
    /postgres:\/\/.*:.*@/g, // Database URLs with credentials
  ]
  
  // Scan source files
  function scanDirectory(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true })
    
    for (const file of files) {
      const filePath = path.join(dir, file.name)
      
      if (file.isDirectory() && !['node_modules', '.git', '.next'].includes(file.name)) {
        scanDirectory(filePath)
      } else if (file.isFile() && /\\.(ts|tsx|js|jsx|md|json)$/.test(file.name)) {
        try {
          const content = fs.readFileSync(filePath, 'utf8')
          
          for (const pattern of secretPatterns) {
            const matches = content.match(pattern)
            if (matches) {
              issues.push({
                file: filePath,
                pattern: pattern.toString(),
                matches: matches.length
              })
            }
          }
        } catch (error) {
          // Skip files that can't be read
        }
      }
    }
  }
  
  scanDirectory('./src')
  
  if (issues.length === 0) {
    log('✅ Security Scan - No exposed secrets found', 'green')
    return true
  } else {
    log('❌ Security Scan - Potential secrets found:', 'red')
    issues.forEach(issue => {
      log(`  ${issue.file}: ${issue.matches} matches for ${issue.pattern}`, 'red')
    })
    return false
  }
}

function validateArchitecture() {
  log('\n🏗️ Architecture Validation', 'blue')
  
  const requiredDirs = [
    'src/lib/config',
    'src/lib/services', 
    'src/lib/utils',
    'src/hooks',
    'src/components',
    'src/types'
  ]
  
  let allExist = true
  for (const dir of requiredDirs) {
    if (!checkFileExists(dir, `Architecture: ${dir}`)) {
      allExist = false
    }
  }
  
  return allExist
}

async function main() {
  log('\n' + '='.repeat(60), 'bold')
  log('🚀 COMPREHENSIVE QUALITY VALIDATION', 'bold')
  log('='.repeat(60), 'bold')
  
  const results = []
  
  // 1. TypeScript & Lint Checks
  results.push(runCommand('npm run build', 'TypeScript Build'))
  
  // Only run lint if script exists
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
    if (packageJson.scripts.lint) {
      results.push(runCommand('npm run lint', 'ESLint Check'))
    }
  } catch {
    log('⚠️  No lint script found - skipping', 'yellow')
  }
  
  // 2. Security Validation
  results.push({ success: scanForSecurityIssues() })
  
  // 3. Architecture Validation
  results.push({ success: validateArchitecture() })
  
  // 4. Dependency Security
  results.push(runCommand('npm audit --audit-level=moderate', 'Dependency Security'))
  
  // 5. Bundle Size Check (if next-bundle-analyzer available)
  try {
    const stats = fs.statSync('.next')
    log('✅ Build Output - Generated successfully', 'green')
    results.push({ success: true })
  } catch {
    log('❌ Build Output - Missing .next directory', 'red')
    results.push({ success: false })
  }
  
  // Summary
  log('\n' + '='.repeat(60), 'bold')
  log('📊 VALIDATION SUMMARY', 'bold')
  log('='.repeat(60), 'bold')
  
  const passed = results.filter(r => r.success).length
  const total = results.length
  
  if (passed === total) {
    log(`\\n🎉 ALL CHECKS PASSED (${passed}/${total})`, 'green')
    log('✅ Code is ready for deployment', 'green')
    process.exit(0)
  } else {
    log(`\\n💥 QUALITY GATE FAILED (${passed}/${total} passed)`, 'red')
    log('❌ Fix issues before proceeding', 'red')
    process.exit(1)
  }
}

// Handle errors gracefully
process.on('unhandledRejection', (error) => {
  log('💥 Unhandled error during validation:', 'red')
  log(error.stack || error, 'red')
  process.exit(1)
})

main().catch(console.error)