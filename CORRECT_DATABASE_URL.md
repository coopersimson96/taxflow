# URGENT: Update Vercel Environment Variable

Please update the DATABASE_URL in your Vercel project immediately:

## Current (BROKEN) URL in Vercel:
```
postgresql://postgres.zpxltmcmtfqrgystdvxu:Supabasetaxflow45123@db.zpxltmcmtfqrgystdvxu.supabase.co:5432/postgres
```

## Correct URL to use:
```
postgresql://postgres.zpxltmcmtfqrgystdvxu:Supabasetaxflow45123@aws-0-ca-central-1.pooler.supabase.com:5432/postgres
```

## Steps:
1. Go to Vercel dashboard → Your project → Settings → Environment Variables
2. Edit DATABASE_URL 
3. Replace with the correct URL above
4. Redeploy

The issue was using `db.zpxltmcmtfqrgystdvxu.supabase.co` instead of the pooler URL `aws-0-ca-central-1.pooler.supabase.com` with port 5432 (instead of 6543).

This should resolve the "Can't reach database server" error.