# 🚨 Shopify API Access Fix Guide

## Problem Summary
- **Issue**: 401 Unauthorized on ALL Shopify API endpoints
- **Root Cause**: Invalid/expired access token OR missing required scopes
- **Store**: taxflow-test.myshopify.com

## Step-by-Step Fix Instructions

### 1. Update Environment Variables

Add the `read_shopify_payments_payouts` scope to your `.env.local` file:

```bash
SHOPIFY_SCOPES=read_orders,read_products,read_customers,read_analytics,read_shopify_payments_payouts
```

### 2. Clear Existing Invalid Integration

Since the current token is invalid, you need to remove it from the database:

1. **Option A: Through Database**
   ```sql
   -- Find your integration
   SELECT * FROM integrations WHERE credentials->>'shop' = 'taxflow-test.myshopify.com';
   
   -- Delete it (replace ID with actual ID from above query)
   DELETE FROM integrations WHERE id = 'YOUR_INTEGRATION_ID';
   ```

2. **Option B: Create Admin Endpoint**
   Add this endpoint to clear invalid integrations:
   ```typescript
   // src/app/api/admin/clear-integration/route.ts
   export async function POST(request: NextRequest) {
     const session = await getServerSession(authOptions)
     if (!session?.user?.email) {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
     }
     
     const deleted = await prisma.integration.deleteMany({
       where: {
         type: 'SHOPIFY',
         organization: {
           members: {
             some: { user: { email: session.user.email } }
           }
         }
       }
     })
     
     return NextResponse.json({ deleted: deleted.count })
   }
   ```

### 3. Re-authenticate Your Shopify Store

1. **Navigate to**: `/integrations` or `/dashboard/integrations`
2. **Click**: "Connect Shopify Store"
3. **Enter**: `taxflow-test` (your shop name)
4. **Authorize**: Accept the new permissions (including payment data access)

### 4. Verify Shopify App Settings

If re-authentication still fails, check your Shopify Partner Dashboard:

1. Go to [partners.shopify.com](https://partners.shopify.com)
2. Select your app
3. Go to **App setup** → **API access**
4. Ensure these scopes are selected:
   - ✅ `read_orders`
   - ✅ `read_products`
   - ✅ `read_customers`
   - ✅ `read_analytics`
   - ✅ `read_shopify_payments_payouts` ← **CRITICAL**

### 5. Alternative: Manual Token Test

Test if it's a token issue or scope issue:

```bash
# Test current token
curl -X GET "https://taxflow-test.myshopify.com/admin/api/2024-01/shop.json" \
  -H "X-Shopify-Access-Token: YOUR_ACCESS_TOKEN"

# If 401, token is invalid. If 200, check scopes:
curl -X GET "https://taxflow-test.myshopify.com/admin/api/2024-01/access_scopes.json" \
  -H "X-Shopify-Access-Token: YOUR_ACCESS_TOKEN"
```

### 6. Common Issues & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| 401 on all endpoints | Expired/invalid token | Re-authenticate (Step 3) |
| 401 on payments only | Missing payment scope | Update scopes & re-auth |
| 404 on payments | Shopify Payments not enabled | Enable in Shopify admin |
| No integration found | User-org relationship broken | Sign out/in to create org |

### 7. Post-Fix Verification

After re-authenticating, test with:
1. Click "Fix API Access" button
2. Should see all ✅ green checkmarks
3. Dashboard should show actual payout amounts

## Next Steps After Fixing

1. **Verify Payouts API**: Should return actual bank deposit amounts
2. **Check Tax Calculations**: Should show accurate tax from real payouts
3. **Test Daily Updates**: Ensure webhook syncs are working

## Need More Help?

- **Shopify API Docs**: https://shopify.dev/docs/api/admin-rest/2024-01/resources/payment
- **Scopes Reference**: https://shopify.dev/docs/api/usage/access-scopes
- **Token Management**: https://shopify.dev/docs/apps/auth/access-token-types

---

**Remember**: For V2 automatic tax withholding, you MUST have accurate payout data. No fallbacks!