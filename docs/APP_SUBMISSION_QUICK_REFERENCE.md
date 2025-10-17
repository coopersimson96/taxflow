# TaxFlow - App Submission Quick Reference

## 📋 Required Information for Shopify App Store Submission

### Basic Info
- **App Name**: TaxFlow - Tax Analytics & Reporting
- **Tagline**: Automated tax tracking and analytics for Shopify merchants
- **URL**: https://taxflow-smoky.vercel.app
- **Support Email**: support@taxflow-smoky.vercel.app
- **Category**: Finance & Accounting

### Legal Pages
- **Privacy Policy**: https://taxflow-smoky.vercel.app/privacy
- **Terms of Service**: https://taxflow-smoky.vercel.app/terms

### Pricing
- **Model**: Paid subscription
- **Price**: $49/month
- **Trial**: 7 days free
- **Billing Method**: Through Shopify (recurring charge)

---

## 🎨 Visual Assets Checklist

### Required Assets

#### 1. App Icon
- **Size**: 1200 x 1200 pixels
- **Format**: PNG with transparent background
- **Location to save**: `/public/app-store-assets/icon-1200.png`

**Design Specs**:
- Gradient background: Teal (#0891B2) to Blue (#0EA5E9)
- White icon symbol (calculator, piggy bank, or chart)
- Clean, recognizable at small sizes
- Rounded corners automatically applied by Shopify

#### 2. App Banner (Optional but Recommended)
- **Size**: 1920 x 1080 pixels
- **Format**: PNG or JPG
- **Location to save**: `/public/app-store-assets/banner-1920x1080.png`

**Content**:
- App name: "TaxFlow"
- Tagline: "Never Miss a Tax Payment"
- Key visual showing dashboard or analytics
- Call to action: "7-Day Free Trial"

#### 3. Screenshots (Minimum 3, Recommended 5-7)
- **Size**: 1920 x 1080 pixels (desktop) OR 750 x 1334 (mobile)
- **Format**: PNG or JPG
- **Location to save**: `/public/app-store-assets/screenshots/`

**Screenshot Titles & Focus**:

1. **screenshot-1-dashboard.png**
   - Title: "Real-Time Tax Dashboard"
   - Shows: Main dashboard with tax totals

2. **screenshot-2-payout.png**
   - Title: "Daily Payout Breakdown"
   - Shows: Payout breakdown with tax separation

3. **screenshot-3-monthly.png**
   - Title: "Monthly Tax Tracking"
   - Shows: Monthly tracking card with progress

4. **screenshot-4-outstanding.png**
   - Title: "Outstanding Payouts"
   - Shows: Outstanding payouts modal/table

5. **screenshot-5-history.png**
   - Title: "Complete Tax History"
   - Shows: Historical data and reports

---

## 📝 App Description (Copy & Paste Ready)

### Short Description (150 characters max)
```
Automated tax tracking for Shopify. See exactly how much tax to set aside from every payout. Multi-jurisdiction support.
```

### Long Description (Use from SHOPIFY_APP_STORE_LISTING.md)
- Full description is in the main listing document
- Includes features, benefits, how it works, and pricing
- Pre-written and ready to copy

---

## 🔑 Key Features (Bullet Points)

Copy these exact bullet points for the app store:

✅ Real-time tax tracking across all orders
✅ Automatic payout breakdown (revenue vs tax)
✅ Multi-jurisdiction support (GST, HST, PST, QST, state & local)
✅ Historical tax data and reporting
✅ Monthly progress tracking
✅ Outstanding payout projections
✅ Export data for accountants
✅ GDPR compliant
✅ Automatic webhook sync
✅ Mobile optimized

---

## 🚀 Installation & Setup Instructions

### For App Store "Getting Started" Section:

```
1. Install & Connect
   - Click "Add app" and approve permissions
   - TaxFlow will automatically import your order history
   - Import typically takes 1-5 minutes

2. Review Your Dashboard
   - See total tax collected to date
   - View tax breakdown by jurisdiction
   - Check recent payout breakdowns

3. Set Up Tax Savings (Recommended)
   - Create a separate "Tax Savings" bank account
   - When you receive a Shopify payout, check TaxFlow
   - Transfer the displayed "Tax Amount" to savings
   - Funds are ready when tax payment is due!

4. Configure Notifications (Optional)
   - Go to Settings to enable email alerts
   - Set thresholds for large tax collections
   - Receive monthly summaries

That's it! TaxFlow runs automatically and updates with every order.
```

---

## 🎬 How to Capture Screenshots

### Using Chrome DevTools:

1. Open your app: https://taxflow-smoky.vercel.app
2. Press F12 to open DevTools
3. Click the device toolbar icon (or Ctrl+Shift+M)
4. Set dimensions to: 1920 x 1080
5. Navigate to each screen you want to capture
6. Take screenshots (use built-in screenshot tool or browser extension)

### Recommended Tool:
- **Awesome Screenshot** (Chrome extension)
- **Full Page Screen Capture** (Chrome extension)
- **macOS**: Cmd+Shift+4 then drag to capture area
- **Windows**: Snipping Tool or Win+Shift+S

### Screenshot Tips:
- Use sample data or create test orders to show realistic numbers
- Ensure text is crisp and readable
- Highlight key features with subtle overlays
- Keep UI clean - close unnecessary tabs/notifications
- Use consistent zoom level across screenshots

---

## 📊 Sample Data for Screenshots

For best-looking screenshots, ensure your test store has:

**Recent Orders**:
- At least 10-20 orders in the current month
- Mix of different tax amounts
- Various tax jurisdictions if possible

**Payout Data**:
- 2-3 recent payouts to show in the table
- Mix of amounts ($500-$3000 range looks good)

**Tax Totals**:
- Aim for realistic numbers:
  - Today: $50-$200
  - This Week: $300-$800
  - This Month: $1,500-$5,000
  - Year to Date: $15,000-$50,000

---

## ⚠️ Important Pre-Submission Checks

### Test These Before Submitting:

- [ ] Install app on a fresh Shopify development store
- [ ] Verify order import works correctly
- [ ] Create a test order and verify it appears in dashboard
- [ ] Check that payout breakdown calculates correctly
- [ ] Test all navigation links work
- [ ] Verify privacy policy page loads
- [ ] Verify terms of service page loads
- [ ] Test responsive design (desktop, tablet, mobile)
- [ ] Confirm no console errors in browser DevTools
- [ ] Test billing flow (if using test mode)

### Common Issues to Fix:

- Console errors (check browser DevTools)
- Broken images or missing icons
- Slow loading times
- Incorrect calculations
- Navigation that doesn't work
- 404 errors on any pages
- Missing or broken links in footer

---

## 📧 Submission Communication Template

### When Submitting to Shopify:

**Subject**: App Submission - TaxFlow Tax Analytics

**Message**:
```
Hello Shopify App Review Team,

I'm submitting TaxFlow for review. This app helps Shopify merchants automatically track tax obligations and break down payouts into revenue and tax components.

Key Features:
- Real-time tax tracking
- Automatic payout breakdown
- Multi-jurisdiction support
- GDPR compliant

Test Store Credentials:
- Store URL: [your-test-store.myshopify.com]
- Admin Username: [username]
- Admin Password: [password]

The app is fully functional and ready for review. All GDPR webhooks are implemented and tested.

Privacy Policy: https://taxflow-smoky.vercel.app/privacy
Terms of Service: https://taxflow-smoky.vercel.app/terms

Please let me know if you need any additional information.

Thank you!
```

---

## 🎯 Quick Links

- **Full Listing Document**: `docs/SHOPIFY_APP_STORE_LISTING.md`
- **App Store Checklist**: `docs/SHOPIFY_APP_STORE_CHECKLIST.md`
- **Privacy Policy**: https://taxflow-smoky.vercel.app/privacy
- **Terms of Service**: https://taxflow-smoky.vercel.app/terms
- **Production App**: https://taxflow-smoky.vercel.app

---

## 💡 Next Steps

1. **Create Visual Assets**
   - Design app icon (1200x1200)
   - Create screenshots (5-7 images)
   - Optional: Create banner and demo video

2. **Test Installation**
   - Install on clean development store
   - Verify all features work
   - Check for errors

3. **Submit to Shopify**
   - Log in to Shopify Partners
   - Go to your app
   - Click "Create app listing"
   - Upload assets and copy description
   - Submit for review

4. **Wait for Review**
   - Typical review time: 5-10 business days
   - Respond promptly to any reviewer questions
   - Make requested changes quickly

---

**Questions?** Review the full listing document or reach out for help!
