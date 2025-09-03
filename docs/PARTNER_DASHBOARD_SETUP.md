# Shopify Partner Dashboard Configuration Guide

This guide walks through configuring your app in the Shopify Partner Dashboard to enable embedded mode and prepare for App Store submission.

## Prerequisites

1. Active Shopify Partner account
2. App created in Partner Dashboard
3. Development store for testing

## Step 1: Access Your App Settings

1. Log in to [Shopify Partners](https://partners.shopify.com)
2. Navigate to Apps → Your App Name
3. Click on "App setup"

## Step 2: Configure Basic App Information

### App Info Section:
- **App name**: Set Aside - Tax Analytics for Shopify
- **App handle**: set-aside-tax-analytics
- **Primary app purpose**: Analytics and reporting
- **App category**: Finance

### Contact Information:
- Fill in your support email
- Add support documentation URL (once available)

## Step 3: Configure App URLs

In the "App URL" section, update these URLs:

```
App URL: https://your-deployed-app.vercel.app
Allowed redirection URL(s): 
  - https://your-deployed-app.vercel.app/api/shopify/callback
  - https://your-deployed-app.vercel.app/dashboard
  - https://your-deployed-app.vercel.app/connect
  - https://your-deployed-app.vercel.app/settings
```

## Step 4: Enable Embedded App

1. In "App setup" → "Embedded app":
   - Toggle **"Embed your app in Shopify admin"** to ON
   - This enables App Bridge and embedded functionality

2. Configure embedded app navigation:
   - **Navigation link text**: Tax Analytics
   - **Navigation link URL**: /dashboard
   - **App home location**: Admin → Analytics

## Step 5: Configure OAuth Scopes

In "API access" section, request these scopes:
```
read_orders
read_products  
read_customers
read_analytics
```

Note: We removed payment scopes as they require special approval.

## Step 6: Configure Webhooks

In "Webhooks" section, set up:

1. **Mandatory GDPR webhooks** (already implemented):
   - `customers/redact`: https://your-app.vercel.app/api/webhooks/shopify/gdpr
   - `customers/data_request`: https://your-app.vercel.app/api/webhooks/shopify/gdpr
   - `shop/redact`: https://your-app.vercel.app/api/webhooks/shopify/gdpr

2. **Order tracking webhooks**:
   - `orders/create`: https://your-app.vercel.app/api/webhooks/shopify/orders
   - `orders/updated`: https://your-app.vercel.app/api/webhooks/shopify/orders
   - `orders/cancelled`: https://your-app.vercel.app/api/webhooks/shopify/orders

## Step 7: App Bridge Configuration

Since we've already implemented App Bridge detection, ensure:

1. Your `.env` variables are set:
   ```
   NEXT_PUBLIC_SHOPIFY_API_KEY=your-api-key-from-partner-dashboard
   SHOPIFY_API_SECRET=your-api-secret-from-partner-dashboard
   ```

2. The app detects embedded mode properly using our `useEmbedded` hook

## Step 8: Session Token Authentication

For embedded apps, configure:

1. **App Bridge Context Provider** (already implemented)
2. **Session token validation** on API routes
3. **CORS headers** for embedded requests

## Step 9: Test Embedded Mode

1. Install app on development store
2. Access via Shopify Admin
3. Verify Polaris UI loads
4. Test navigation and functionality

## Step 10: Prepare for Review

Before submitting for review:

### Required Assets:
- [ ] App icon (512x512px)
- [ ] App listing banner (1920x1080px)
- [ ] 3-5 screenshots showing key features
- [ ] Demo video (optional but recommended)

### App Listing Content:
- [ ] Short description (up to 160 characters)
- [ ] Detailed description highlighting benefits
- [ ] Key features list
- [ ] Pricing information

### Technical Requirements:
- [x] GDPR webhooks implemented
- [x] Secure authentication
- [x] Error handling
- [x] Loading states
- [ ] Rate limiting
- [ ] Monitoring/logging

## Environment Variables

Update your production environment with:

```env
# From Partner Dashboard
SHOPIFY_API_KEY=<from-partner-dashboard>
NEXT_PUBLIC_SHOPIFY_API_KEY=<same-as-above>
SHOPIFY_API_SECRET=<from-partner-dashboard>
SHOPIFY_WEBHOOK_SECRET=<from-partner-dashboard>

# Your deployed app URL
SHOPIFY_APP_URL=https://your-app.vercel.app
NEXTAUTH_URL=https://your-app.vercel.app
```

## Common Issues

### App Not Loading in Admin
- Check embedded app is enabled
- Verify App Bridge initialization
- Check browser console for errors

### OAuth Errors
- Verify redirect URLs match exactly
- Check API credentials
- Ensure scopes haven't changed

### Session Token Issues
- Implement proper token validation
- Handle token refresh
- Check CORS configuration

## Next Steps

1. Complete all configuration in Partner Dashboard
2. Test thoroughly on development store
3. Submit for Shopify review
4. Monitor review feedback
5. Address any requested changes

## Support

For issues with:
- Partner Dashboard: partners@shopify.com
- App Review: app-review@shopify.com
- Technical: Shopify Dev Forums