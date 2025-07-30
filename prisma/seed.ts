import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create a demo user
  const user = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      name: 'Demo User',
      emailVerified: new Date(),
    },
  })

  console.log('✅ Created demo user:', user.email)

  // Create a demo organization
  const organization = await prisma.organization.upsert({
    where: { slug: 'demo-company' },
    update: {},
    create: {
      name: 'Demo Company',
      slug: 'demo-company',
      description: 'A demo organization for testing',
      taxId: '12-3456789',
      address: {
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        country: 'US',
        zipCode: '12345'
      },
      timezone: 'America/Los_Angeles',
      settings: {
        currency: 'USD',
        taxRate: 0.0875,
        fiscalYearStart: 'January'
      }
    },
  })

  console.log('✅ Created demo organization:', organization.name)

  // Add user as owner of the organization
  await prisma.organizationMember.upsert({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: organization.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      organizationId: organization.id,
      role: 'OWNER',
    },
  })

  console.log('✅ Added user as organization owner')

  // Create demo integrations
  const shopifyIntegration = await prisma.integration.upsert({
    where: {
      organizationId_type: {
        organizationId: organization.id,
        type: 'SHOPIFY',
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      type: 'SHOPIFY',
      name: 'Demo Shopify Store',
      status: 'CONNECTED',
      config: {
        shopDomain: 'demo-store.myshopify.com',
        apiVersion: '2024-01',
      },
      lastSyncAt: new Date(),
      syncStatus: 'SUCCESS',
    },
  })

  const squareIntegration = await prisma.integration.upsert({
    where: {
      organizationId_type: {
        organizationId: organization.id,
        type: 'SQUARE',
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      type: 'SQUARE',
      name: 'Demo Square POS',
      status: 'CONNECTED',
      config: {
        locationId: 'demo-location',
        environment: 'sandbox',
      },
      lastSyncAt: new Date(),
      syncStatus: 'SUCCESS',
    },
  })

  console.log('✅ Created demo integrations')

  // Create sample transactions
  const transactions = [
    {
      externalId: 'shopify_order_001',
      integrationId: shopifyIntegration.id,
      type: 'SALE' as const,
      status: 'COMPLETED' as const,
      currency: 'USD',
      subtotal: 10000, // $100.00
      taxAmount: 875,   // $8.75
      totalAmount: 10875, // $108.75
      customerEmail: 'customer@example.com',
      customerName: 'John Doe',
      items: [
        {
          name: 'Widget Pro',
          quantity: 2,
          unitPrice: 5000,
          totalPrice: 10000,
          taxable: true
        }
      ],
      transactionDate: new Date('2024-01-15'),
    },
    {
      externalId: 'square_payment_001',
      integrationId: squareIntegration.id,
      type: 'SALE' as const,
      status: 'COMPLETED' as const,
      currency: 'USD',
      subtotal: 2500, // $25.00
      taxAmount: 219,  // $2.19
      totalAmount: 2719, // $27.19
      customerName: 'Jane Smith',
      items: [
        {
          name: 'Coffee',
          quantity: 1,
          unitPrice: 500,
          totalPrice: 500,
          taxable: true
        },
        {
          name: 'Pastry',
          quantity: 1,
          unitPrice: 2000,
          totalPrice: 2000,
          taxable: true
        }
      ],
      transactionDate: new Date('2024-01-16'),
    },
  ]

  for (const transaction of transactions) {
    await prisma.transaction.create({
      data: {
        ...transaction,
        organizationId: organization.id,
      },
    })
  }

  console.log('✅ Created sample transactions')

  // Create a tax period
  await prisma.taxPeriod.upsert({
    where: {
      organizationId_type_year_quarter_month: {
        organizationId: organization.id,
        type: 'QUARTERLY',
        year: 2024,
        quarter: 1,
        month: undefined,
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      name: 'Q1 2024',
      type: 'QUARTERLY',
      year: 2024,
      quarter: 1,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-03-31'),
      dueDate: new Date('2024-04-30'),
      status: 'DRAFT',
      totalSales: 12500,
      totalTax: 1094,
    },
  })

  console.log('✅ Created tax period')

  // Create a welcome notification
  await prisma.notification.create({
    data: {
      userId: user.id,
      organizationId: organization.id,
      title: 'Welcome to Tax Analytics!',
      message: 'Your account has been set up successfully. Start by connecting your first integration.',
      type: 'WELCOME',
      priority: 'MEDIUM',
      channels: ['EMAIL', 'IN_APP'],
      status: 'DELIVERED',
    },
  })

  console.log('✅ Created welcome notification')

  console.log('🎉 Database seed completed successfully!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })