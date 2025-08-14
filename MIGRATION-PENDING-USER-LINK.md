# Database Migration: Add PENDING_USER_LINK Status

## SQL to run in Supabase SQL Editor:

```sql
-- Add PENDING_USER_LINK to IntegrationStatus enum
ALTER TYPE "IntegrationStatus" ADD VALUE 'PENDING_USER_LINK';
```

This migration adds support for the new `PENDING_USER_LINK` integration status that allows stores to be connected even when the user email doesn't match the Shopify store owner email. The store will be created with this status and can be manually linked to the correct user account through the linking interface.

## After running this SQL:

1. The foundational multi-email linking system will work
2. Stores that can't be auto-matched will be saved with PENDING_USER_LINK status
3. Users can manually link these stores through the `/link-store` interface
4. No more "user not found" errors during Shopify connections