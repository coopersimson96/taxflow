# Database Setup Guide

This guide will help you set up the PostgreSQL database with Supabase for your Tax Analytics application.

## Prerequisites

- Supabase account (free tier available)
- Node.js 18+ installed
- npm or yarn package manager

## Quick Start

1. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```

2. Update your `.env.local` with Supabase credentials
3. Install dependencies:
   ```bash
   npm install
   ```

4. Generate Prisma client:
   ```bash
   npm run db:generate
   ```

5. Push database schema:
   ```bash
   npm run db:push
   ```

6. Seed initial data:
   ```bash
   npm run db:seed
   ```

## Supabase Setup

### 1. Create Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click "New project"
3. Choose your organization
4. Fill in project details:
   - Name: `tax-analytics-app`
   - Database password: Generate a secure password
   - Region: Choose closest to your users
5. Click "Create new project"

### 2. Get Database Credentials

From your Supabase project dashboard:

1. Go to Settings → Database
2. Find the "Connection string" section
3. Copy the URI format connection string
4. Replace `[YOUR-PASSWORD]` with your database password

Example:
```
DATABASE_URL=postgresql://postgres.abcdefghijklmnop:password@aws-0-us-west-1.pooler.supabase.com:6543/postgres?schema=public
```

### 3. Get API Keys

1. Go to Settings → API
2. Copy the following values:
   - Project URL → `SUPABASE_URL`
   - `anon` `public` key → `SUPABASE_ANON_KEY`
   - `service_role` `secret` key → `SUPABASE_SERVICE_ROLE_KEY`

### 4. Update Environment Variables

Update your `.env.local` file:

```env
# Database - Supabase PostgreSQL
DATABASE_URL=postgresql://postgres.abcdefghijklmnop:your-password@aws-0-us-west-1.pooler.supabase.com:6543/postgres?schema=public
SUPABASE_URL=https://abcdefghijklmnop.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

## Database Schema Overview

The application uses the following main entities:

### Core Models

- **Users**: Application users with authentication
- **Organizations**: Multi-tenant support for businesses
- **OrganizationMembers**: User roles within organizations
- **Integrations**: Third-party service connections (Shopify, Square, etc.)
- **Transactions**: Sales, refunds, and other financial transactions
- **TaxPeriods**: Tax reporting periods (monthly, quarterly, annual)
- **Notifications**: System alerts and notifications
- **Sessions/Accounts**: Authentication support

### Key Features

- **Multi-tenant architecture**: Each organization has isolated data
- **Flexible integrations**: Support for multiple payment processors
- **Comprehensive transaction tracking**: All financial data with tax details
- **Tax period management**: Automated tax reporting periods
- **Audit trail**: Full history of changes and updates
- **Role-based access**: Different permission levels per organization

## Database Commands

### Development Workflow

```bash
# Generate Prisma client after schema changes
npm run db:generate

# Push schema changes to database (development)
npm run db:push

# Create and run migrations (production-ready)
npm run db:migrate

# Reset database (careful - deletes all data!)
npm run db:reset

# Seed database with sample data
npm run db:seed

# Open Prisma Studio (database GUI)
npm run db:studio

# Deploy migrations (production)
npm run db:deploy
```

### Database Migrations

For production deployments, always use migrations:

```bash
# Create a new migration
npx prisma migrate dev --name add_new_feature

# Deploy migrations to production
npm run db:deploy
```

## Environment Setup for Integrations

### Shopify Configuration

1. Create a Shopify Partner account
2. Create a new app in Partner Dashboard
3. Set up app URLs:
   - App URL: `https://your-app.ngrok.io`
   - Allowed redirection URLs: `https://your-app.ngrok.io/api/auth/shopify/callback`
4. Configure scopes: `read_orders,read_products,read_customers,read_analytics`
5. Copy API credentials to `.env.local`

### Square Configuration

1. Create Square Developer account
2. Create new application
3. Get Application ID and Access Token
4. Set webhook endpoints for transaction updates
5. Copy credentials to `.env.local`

### Resend Email Configuration

1. Sign up for Resend account
2. Create API key
3. Verify your sending domain
4. Update `.env.local` with API key and from email

## Troubleshooting

### Common Issues

1. **Connection timeout**:
   - Check if DATABASE_URL is correct
   - Verify Supabase project is active
   - Check network connectivity

2. **Migration errors**:
   - Run `npx prisma migrate reset` to start fresh
   - Check for schema conflicts
   - Ensure database is accessible

3. **Prisma client issues**:
   - Run `npm run db:generate` after schema changes
   - Restart your development server
   - Clear node_modules and reinstall if needed

### Database Performance

For better performance in production:

1. Enable Row Level Security (RLS) in Supabase
2. Create appropriate indexes for your queries
3. Use connection pooling
4. Monitor query performance in Supabase dashboard

## Security Considerations

1. **Environment Variables**: Never commit `.env.local` to version control
2. **Database Access**: Use least-privilege access for API keys
3. **Encryption**: Sensitive integration credentials are encrypted in database
4. **Audit Trail**: All changes are logged with timestamps and user info
5. **Row Level Security**: Consider enabling RLS for additional data isolation

## Production Deployment

1. Set up production Supabase project
2. Configure production environment variables
3. Run database migrations: `npm run db:deploy`
4. Set up monitoring and alerting
5. Configure backup schedule in Supabase

## Support

For issues with:
- Database setup: Check Supabase documentation
- Schema changes: Review Prisma documentation
- Integration issues: Check respective API documentation (Shopify, Square)

## Useful Links

- [Supabase Documentation](https://supabase.com/docs)
- [Prisma Documentation](https://prisma.io/docs)
- [Shopify API Documentation](https://shopify.dev/docs)
- [Square API Documentation](https://developer.squareup.com/docs)