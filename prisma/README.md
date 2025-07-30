# Database Setup Guide

This directory contains the Prisma database schema and utilities for the Tax Analytics App.

## Quick Start

1. **Set up your environment variables:**
   ```bash
   cp .env.example .env
   ```
   Update the `DATABASE_URL` with your Supabase PostgreSQL connection string.

2. **Generate the Prisma client:**
   ```bash
   npm run db:generate
   ```

3. **Push the schema to your database:**
   ```bash
   npm run db:push
   ```

4. **Seed the database with sample data:**
   ```bash
   npm run db:seed
   ```

## Database Schema Overview

### Core Entities

- **Users**: User accounts with authentication
- **Organizations**: Multi-tenant organizations 
- **OrganizationMembers**: User roles within organizations
- **Integrations**: Third-party platform connections (Shopify, Square, etc.)
- **Transactions**: Sales/refund records from integrated platforms
- **TaxPeriods**: Tax reporting periods (monthly/quarterly/annual)
- **Notifications**: System alerts and user notifications

### Key Features

- **Multi-tenant architecture** with organization-based data isolation
- **Flexible integration system** supporting multiple e-commerce platforms
- **Comprehensive transaction tracking** with tax calculations
- **Tax period management** for compliance reporting
- **Rich notification system** for alerts and updates

## Available Scripts

- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database
- `npm run db:migrate` - Create and apply migrations
- `npm run db:reset` - Reset database and run seeds
- `npm run db:seed` - Populate database with sample data
- `npm run db:studio` - Open Prisma Studio GUI
- `npm run db:deploy` - Deploy migrations (production)

## Environment Variables

Required environment variables for database connection:

```env
# Supabase PostgreSQL
DATABASE_URL=postgresql://postgres:[password]@[host]:5432/[database]?schema=public
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

## Integration Setup

The schema supports multiple integration types:

- **SHOPIFY**: E-commerce platform integration
- **SQUARE**: Point-of-sale system integration  
- **STRIPE**: Payment processing integration
- **PAYPAL**: Payment gateway integration
- **QUICKBOOKS**: Accounting software integration
- **XERO**: Accounting platform integration

Each integration stores configuration and credentials securely, with support for webhooks and automatic data synchronization.

## Tax Calculations

The system tracks detailed tax information:

- Subtotals, tax amounts, and totals (stored as integers in cents)
- Tax-exempt transactions and reasons
- Detailed tax breakdowns per jurisdiction
- Support for multiple tax rates and rules

## Data Security

- Sensitive integration credentials are encrypted
- User data is properly isolated by organization
- Audit trails for all financial transactions
- Secure webhook validation and processing

## Migration Strategy

For production deployments:

1. Use `npm run db:migrate` for schema changes
2. Always backup before migrations
3. Use `npm run db:deploy` for production deployment
4. Monitor database performance after changes

## Troubleshooting

**Connection Issues:**
- Verify DATABASE_URL format
- Check Supabase connection limits
- Ensure proper SSL configuration

**Migration Errors:**
- Check for conflicting schema changes
- Verify database permissions
- Review migration history

**Performance:**
- Use database indexes for queries
- Monitor slow query logs
- Consider connection pooling for high traffic