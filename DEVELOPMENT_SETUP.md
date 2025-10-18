# Development Setup - Handling Shopify Protected Customer Data

## Current Situation

The app requires Shopify's protected customer data approval to access Order objects via their APIs. Until the app is approved by Shopify, both REST and GraphQL APIs will return 403 errors.

## Proper Solution (Production)

1. Submit app to Shopify App Store for review
2. Request protected customer data access during submission
3. Once approved, the app will have full API access

## Development/Testing Solution

For development and testing before approval, use sample data:

### 1. Set Environment Variable

In your `.env.local` file or Vercel environment variables, add:

```
USE_SAMPLE_DATA=true
```

### 2. What This Does

- Generates realistic sample order data for testing
- Includes proper tax calculations, line items, and geographic data
- Allows full app functionality testing without API access
- Clearly logs when sample data is being used

### 3. Important Notes

- **This is a temporary solution for development only**
- **MUST be removed before Shopify submission**
- Sample data is clearly marked in console logs
- Will automatically use real APIs when `USE_SAMPLE_DATA` is not set to "true"

## Error Messages

If you see these errors:
- "This app is not approved to access the Order object"
- "protected customer data"

This means the app needs Shopify approval. Set `USE_SAMPLE_DATA=true` for testing.

## Before Shopify Submission

1. Remove all sample data code (marked with TODO comments)
2. Ensure GraphQL API is the primary method
3. Test with an approved app/store
4. Remove this documentation file

## Files to Clean Before Submission

- `/src/lib/services/sample-data-generator.ts` - DELETE ENTIRE FILE
- `/src/lib/sample-data-store.ts` - DELETE ENTIRE FILE
- `/src/lib/services/historical-import.ts` - Remove sample data logic
- `/src/lib/middleware/billing-check.ts` - Remove USE_SAMPLE_DATA bypass (lines 112-117)
- `/src/app/api/analytics/tax-dashboard/calculate-payouts.ts` - Remove sample data logic
- `/src/app/api/analytics/daily-payout/route.ts` - Remove sample data logic (lines 123-150)
- `/src/app/api/analytics/monthly-tracking/route.ts` - Remove sample data logic (lines 119-129)
- `/src/app/api/analytics/recent-payouts/route.ts` - Remove sample data logic
- `/src/app/api/analytics/outstanding-payouts/route.ts` - Remove sample data logic
- Environment variables - Remove `USE_SAMPLE_DATA=true` from all environments