import { prisma } from '../src/lib/prisma'

async function checkShopifyConnection() {
  try {
    console.log('🔍 Checking database for Shopify connections...\n')

    // Check users
    const users = await prisma.user.findMany({
      include: {
        linkedEmails: true
      }
    })
    
    console.log(`Found ${users.length} users:`)
    users.forEach(user => {
      console.log(`- ${user.email} (ID: ${user.id})`)
      if (user.linkedEmails.length > 0) {
        console.log(`  Linked emails: ${user.linkedEmails.map(e => e.email).join(', ')}`)
      }
    })

    // Check integrations
    console.log('\n🔌 Checking integrations...')
    const integrations = await prisma.integration.findMany({
      select: {
        id: true,
        type: true,
        status: true,
        name: true,
        organizationId: true,
        credentials: true,
        createdAt: true,
        lastSync: true
      }
    })

    console.log(`Found ${integrations.length} integrations:`)
    integrations.forEach(integration => {
      console.log(`\n- ${integration.name || 'Unnamed'} (${integration.type})`)
      console.log(`  Status: ${integration.status}`)
      console.log(`  Organization ID: ${integration.organizationId}`)
      console.log(`  Created: ${integration.createdAt}`)
      console.log(`  Last Sync: ${integration.lastSync || 'Never'}`)
      
      if (integration.credentials) {
        const creds = integration.credentials as any
        console.log(`  Shop Domain: ${creds.shopDomain || 'N/A'}`)
        console.log(`  Shop Email: ${creds.shopInfo?.email || 'N/A'}`)
        console.log(`  Customer Email: ${creds.shopInfo?.customer_email || 'N/A'}`)
      }
    })

    // Check organizations
    console.log('\n🏢 Checking organizations...')
    const orgs = await prisma.organization.findMany({
      include: {
        members: {
          include: {
            user: true
          }
        }
      }
    })

    console.log(`Found ${orgs.length} organizations:`)
    orgs.forEach(org => {
      console.log(`\n- ${org.name} (ID: ${org.id})`)
      console.log(`  Members: ${org.members.length}`)
      org.members.forEach(member => {
        console.log(`    - ${member.user.email} (${member.role})`)
      })
    })

    // Check transactions
    console.log('\n📊 Checking transactions...')
    const transactionCount = await prisma.transaction.count()
    console.log(`Total transactions: ${transactionCount}`)

    if (transactionCount > 0) {
      const recentTransactions = await prisma.transaction.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orderNumber: true,
          totalAmount: true,
          taxAmount: true,
          createdAt: true,
          organizationId: true
        }
      })

      console.log('\nRecent transactions:')
      recentTransactions.forEach(tx => {
        console.log(`- Order #${tx.orderNumber}: $${tx.totalAmount / 100} (Tax: $${tx.taxAmount / 100})`)
      })
    }

  } catch (error) {
    console.error('❌ Error checking database:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkShopifyConnection()