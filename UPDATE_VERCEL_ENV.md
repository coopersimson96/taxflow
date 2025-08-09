# Update Vercel Environment Variables

Please update the DATABASE_URL in your Vercel project settings:

1. Go to: https://vercel.com/your-account/taxflow/settings/environment-variables
2. Find DATABASE_URL
3. Change it from:
   ```
   postgresql://postgres.zpxltmcmtfqrgystdvxu:Supabasetaxflow45123@aws-0-ca-central-1.pooler.supabase.com:6543/postgres
   ```
   To:
   ```
   postgresql://postgres.zpxltmcmtfqrgystdvxu:Supabasetaxflow45123@db.zpxltmcmtfqrgystdvxu.supabase.co:5432/postgres
   ```

This switches from the pooled connection (port 6543) to the direct connection (port 5432), which will resolve the prepared statement errors.

After updating, redeploy your project.