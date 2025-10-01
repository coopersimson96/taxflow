# Canadian Tax Implementation

## Overview

Implemented accurate Canadian tax structure for sample data generation, including proper HST, GST, and PST classifications.

## Tax Structure

### Canadian Tax System (as of 2024)

1. **HST Provinces** (Harmonized Sales Tax - Combined Federal + Provincial):
   - Ontario (ON): 13%
   - Nova Scotia (NS): 15%
   - New Brunswick (NB): 15%
   - Newfoundland and Labrador (NL): 15%
   - Prince Edward Island (PE): 15%

2. **GST + PST Provinces** (Separate Federal and Provincial Taxes):
   - British Columbia (BC): 5% GST + 7% PST = 12% total
   - Saskatchewan (SK): 5% GST + 6% PST = 11% total
   - Manitoba (MB): 5% GST + 7% PST = 12% total
   - Quebec (QC): 5% GST + 9.975% QST = 14.975% total

3. **GST Only** (Federal Tax Only):
   - Alberta (AB): 5%
   - Northwest Territories (NT): 5%
   - Nunavut (NU): 5%
   - Yukon (YT): 5%

## Implementation Details

### Tax Line Generation

Each line item and shipping charge gets appropriate tax lines based on the province:

```javascript
// For HST provinces (e.g., Ontario)
tax_lines: [{
  title: "HST 13%",
  rate: 0.13,
  price: "calculated_amount"
}]

// For GST+PST provinces (e.g., British Columbia)  
tax_lines: [{
  title: "GST 5%",
  rate: 0.05,
  price: "calculated_amount"
}, {
  title: "PST 7%",
  rate: 0.07,
  price: "calculated_amount"
}]
```

### Order-Level Tax Aggregation

Order-level tax lines show the breakdown of total taxes collected:
- HST provinces show single line with province code
- GST+PST provinces show separate lines with proper attribution

### Sample Locations

Includes major cities from different tax jurisdictions:
- Toronto, ON (HST 13%)
- Vancouver, BC (GST 5% + PST 7%)
- Montreal, QC (GST 5% + QST 9.975%)
- Calgary, AB (GST 5% only)
- Halifax, NS (HST 15%)
- Winnipeg, MB (GST 5% + PST 7%)
- Regina, SK (GST 5% + PST 6%)
- Charlottetown, PE (HST 15%)

## Dashboard Display

The tax dashboard will now show:
1. Separate tax categories (HST, GST, PST/QST)
2. Tax amounts by jurisdiction
3. Proper tax rate percentages
4. Province-specific tax breakdowns

## Testing

With `USE_SAMPLE_DATA=true`, the app generates orders with:
- Realistic Canadian tax structures
- Proper tax line classifications
- Accurate tax calculations by province
- Mix of HST and GST+PST jurisdictions

## Future Considerations

When real Shopify data is available:
- Tax lines will come directly from Shopify's tax calculation engine
- Sample data logic will be removed
- Dashboard will display actual merchant tax data