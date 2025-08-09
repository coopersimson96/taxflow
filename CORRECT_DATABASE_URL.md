# URGENT: Update Vercel Environment Variable

Please update the DATABASE_URL in your Vercel project immediately:

## Current (BROKEN) URL in Vercel:
```
postgresql://postgres.zpxltmcmtfqrgystdvxu:Supabasetaxflow45123@db.zpxltmcmtfqrgystdvxu.supabase.co:5432/postgres
```

## Correct DIRECT CONNECTION URL to use:
```
postgresql://postgres:Supabasetaxflow45123@db.zpxltmcmtfqrgystdvxu.supabase.co:5432/postgres
```

## Steps:
1. Go to Vercel dashboard → Your project → Settings → Environment Variables
2. Edit DATABASE_URL 
3. Replace with the correct DIRECT connection URL above
4. Redeploy

This uses the direct AWS RDS connection (`aws-0-ca-central-1.compute.amazonaws.com:5432`) instead of Supabase's pooler, which eliminates prepared statement issues and is more reliable for production.

This should resolve the "Can't reach database server" error.