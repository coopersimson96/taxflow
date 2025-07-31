# Deployment Checklist - Vercel Build Fix

## Pre-Deployment Verification ✅

### Local Build Tests
- ✅ `npm run build` - Completes successfully
- ✅ `npm run lint` - No ESLint errors
- ✅ `npx tsc --noEmit` - No TypeScript errors
- ✅ `node scripts/verify-build.js` - Build verification passes

### Dynamic Pages Configuration
- ✅ `/auth/signin` - Marked as dynamic (ƒ)
- ✅ `/auth/error` - Marked as dynamic (ƒ)
- ✅ `/connect` - Marked as dynamic (ƒ)
- ✅ API routes properly configured with `dynamic = 'force-dynamic'`

### Architecture Verification
- ✅ Server components handle static rendering
- ✅ Client components wrapped in Suspense boundaries
- ✅ Proper separation of server/client code
- ✅ No mixed rendering patterns

## Deployment Configuration

### Required Environment Variables (Vercel Dashboard)
```bash
# Authentication
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=your-secret-key

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Database
DATABASE_URL=your-supabase-connection-string

# Shopify Integration
SHOPIFY_API_KEY=your-shopify-api-key
SHOPIFY_API_SECRET=your-shopify-api-secret
SHOPIFY_SCOPES=read_orders,read_products
```

### Vercel Project Settings
- ✅ Build Command: `npm run build`
- ✅ Output Directory: `.next`
- ✅ Install Command: `npm install`
- ✅ Node.js Version: 18.x or 20.x

## Post-Deployment Tasks

### 1. Update OAuth Settings
Once deployed, update:
- **Google OAuth**: Add production domain to authorized URLs
- **Shopify App**: Update app URLs with production domain

### 2. Test Critical Flows
- [ ] User authentication (Google OAuth)
- [ ] Shopify store connection
- [ ] Webhook handling
- [ ] Database operations

### 3. Monitor for Issues
- [ ] Check Vercel function logs
- [ ] Monitor error reporting
- [ ] Verify webhook endpoints are accessible

## Troubleshooting

### If Build Still Fails
1. Check environment variables are set in Vercel
2. Verify all dependencies are in package.json
3. Check for any remaining static rendering issues

### Common Issues
- **Missing env vars**: Set in Vercel dashboard
- **OAuth redirects**: Update callback URLs
- **Database connection**: Verify connection string
- **Webhook URLs**: Must be HTTPS in production

## Rollback Plan
If deployment fails:
1. Previous commit hash: `b9e697a`
2. Revert changes: `git reset --hard b9e697a`
3. Force push: `git push origin main --force`

## Success Criteria
- ✅ Build completes without errors
- ✅ All pages load correctly
- ✅ OAuth flow works end-to-end
- ✅ Shopify integration functional
- ✅ No runtime errors in logs

## Key Changes Made
1. **Explicit Dynamic Exports**: Added `export const dynamic = 'force-dynamic'` to problematic pages
2. **Proper Suspense Boundaries**: Client components wrapped correctly
3. **Architecture Separation**: Clear server/client component boundaries
4. **Build Configuration**: Updated next.config.js for proper handling

This configuration should resolve all Vercel build issues and provide a stable deployment.