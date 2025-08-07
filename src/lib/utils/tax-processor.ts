/**
 * Tax Processing Utility
 * Processes Shopify tax data and categorizes it into specific tax types
 * for compliance reporting and analytics
 */

export interface TaxLine {
  title: string;
  price: string;
  rate: number;
  price_set?: {
    shop_money: {
      amount: string;
      currency_code: string;
    };
    presentment_money: {
      amount: string;
      currency_code: string;
    };
  };
  channel_liable?: boolean;
}

export interface ProcessedTaxBreakdown {
  // Individual tax amounts in cents
  gstAmount: number;
  pstAmount: number;
  hstAmount: number;
  qstAmount: number;
  stateTaxAmount: number;
  localTaxAmount: number;
  otherTaxAmount: number;
  
  // Jurisdiction info
  taxCountry: string | null;
  taxProvince: string | null;
  taxCity: string | null;
  taxPostalCode: string | null;
  
  // Detailed breakdown
  taxBreakdown: Array<{
    type: string;
    title: string;
    amount: number; // in cents
    rate: number;   // as decimal (0.05 = 5%)
    currency: string;
    jurisdiction: {
      country: string | null;
      province: string | null;
      city: string | null;
      postalCode: string | null;
    };
  }>;
}

/**
 * Maps tax titles to standardized tax types
 */
const TAX_TYPE_MAPPING: Record<string, string> = {
  // Canadian taxes
  'GST': 'gst',
  'HST': 'hst', 
  'PST': 'pst',
  'QST': 'qst',
  'Quebec Sales Tax': 'qst',
  'Goods and Services Tax': 'gst',
  'Harmonized Sales Tax': 'hst',
  'Provincial Sales Tax': 'pst',
  
  // US taxes
  'Sales Tax': 'state',
  'State Tax': 'state', 
  'CA State Tax': 'state',
  'NY State Tax': 'state',
  'WA State Tax': 'state',
  'Local Tax': 'local',
  'City Tax': 'local',
  'County Tax': 'local',
  
  // Other common patterns
  'VAT': 'other',
  'Value Added Tax': 'other',
  'Customs': 'other',
  'Import Tax': 'other',
  'Duty': 'other'
};

/**
 * Determines tax type from tax line title
 */
function determineTaxType(title: string): string {
  // Direct match first
  if (TAX_TYPE_MAPPING[title]) {
    return TAX_TYPE_MAPPING[title];
  }
  
  // Pattern matching for variations
  const upperTitle = title.toUpperCase();
  
  if (upperTitle.includes('GST') || upperTitle.includes('GOODS') && upperTitle.includes('SERVICE')) {
    return 'gst';
  }
  if (upperTitle.includes('PST') || upperTitle.includes('PROVINCIAL')) {
    return 'pst';
  }
  if (upperTitle.includes('HST') || upperTitle.includes('HARMONIZED')) {
    return 'hst';
  }
  if (upperTitle.includes('QST') || upperTitle.includes('QUEBEC')) {
    return 'qst';
  }
  if (upperTitle.includes('STATE') || upperTitle.includes('SALES TAX')) {
    return 'state';
  }
  if (upperTitle.includes('LOCAL') || upperTitle.includes('CITY') || upperTitle.includes('COUNTY')) {
    return 'local';
  }
  if (upperTitle.includes('VAT') || upperTitle.includes('VALUE ADDED')) {
    return 'other';
  }
  
  // Default to other for unrecognized types
  return 'other';
}

/**
 * Extracts tax jurisdiction from address information
 */
function extractTaxJurisdiction(billingAddress: any, shippingAddress: any): {
  country: string | null;
  province: string | null;
  city: string | null;
  postalCode: string | null;
} {
  // Prefer billing address for tax jurisdiction, fallback to shipping
  const address = billingAddress || shippingAddress;
  
  if (!address) {
    return {
      country: null,
      province: null,
      city: null,
      postalCode: null
    };
  }
  
  return {
    country: address.country_code || address.country || null,
    province: address.province_code || address.province || null,
    city: address.city || null,
    postalCode: address.zip || address.postal_code || null
  };
}

/**
 * Processes Shopify tax lines and categorizes them for compliance reporting
 */
export function processTaxBreakdown(
  taxLines: TaxLine[],
  billingAddress: any = null,
  shippingAddress: any = null
): ProcessedTaxBreakdown {
  
  const result: ProcessedTaxBreakdown = {
    gstAmount: 0,
    pstAmount: 0,
    hstAmount: 0,
    qstAmount: 0,
    stateTaxAmount: 0,
    localTaxAmount: 0,
    otherTaxAmount: 0,
    taxCountry: null,
    taxProvince: null,
    taxCity: null,
    taxPostalCode: null,
    taxBreakdown: []
  };
  
  // Extract jurisdiction information
  const jurisdiction = extractTaxJurisdiction(billingAddress, shippingAddress);
  result.taxCountry = jurisdiction.country;
  result.taxProvince = jurisdiction.province;
  result.taxCity = jurisdiction.city;
  result.taxPostalCode = jurisdiction.postalCode;
  
  // Process each tax line
  for (const taxLine of taxLines) {
    const amount = Math.round(parseFloat(taxLine.price || '0') * 100); // Convert to cents
    const rate = taxLine.rate || 0;
    const taxType = determineTaxType(taxLine.title);
    const currency = taxLine.price_set?.shop_money?.currency_code || 'USD';
    
    // Add to appropriate tax category
    switch (taxType) {
      case 'gst':
        result.gstAmount += amount;
        break;
      case 'pst':
        result.pstAmount += amount;
        break;
      case 'hst':
        result.hstAmount += amount;
        break;
      case 'qst':
        result.qstAmount += amount;
        break;
      case 'state':
        result.stateTaxAmount += amount;
        break;
      case 'local':
        result.localTaxAmount += amount;
        break;
      default:
        result.otherTaxAmount += amount;
        break;
    }
    
    // Add to detailed breakdown
    result.taxBreakdown.push({
      type: taxType,
      title: taxLine.title,
      amount: amount,
      rate: rate,
      currency: currency,
      jurisdiction: {
        country: jurisdiction.country,
        province: jurisdiction.province,
        city: jurisdiction.city,
        postalCode: jurisdiction.postalCode
      }
    });
  }
  
  return result;
}

/**
 * Validates that tax amounts match the total
 */
export function validateTaxBreakdown(breakdown: ProcessedTaxBreakdown, expectedTotal: number): {
  isValid: boolean;
  calculatedTotal: number;
  difference: number;
} {
  const calculatedTotal = breakdown.gstAmount + breakdown.pstAmount + breakdown.hstAmount + 
                         breakdown.qstAmount + breakdown.stateTaxAmount + breakdown.localTaxAmount + 
                         breakdown.otherTaxAmount;
  
  const difference = Math.abs(calculatedTotal - expectedTotal);
  
  return {
    isValid: difference <= 1, // Allow 1 cent difference for rounding
    calculatedTotal,
    difference
  };
}

/**
 * Formats tax breakdown for logging/debugging
 */
export function formatTaxBreakdownSummary(breakdown: ProcessedTaxBreakdown): string {
  const lines = [];
  
  if (breakdown.gstAmount > 0) lines.push(`GST: $${(breakdown.gstAmount / 100).toFixed(2)}`);
  if (breakdown.pstAmount > 0) lines.push(`PST: $${(breakdown.pstAmount / 100).toFixed(2)}`);
  if (breakdown.hstAmount > 0) lines.push(`HST: $${(breakdown.hstAmount / 100).toFixed(2)}`);
  if (breakdown.qstAmount > 0) lines.push(`QST: $${(breakdown.qstAmount / 100).toFixed(2)}`);
  if (breakdown.stateTaxAmount > 0) lines.push(`State: $${(breakdown.stateTaxAmount / 100).toFixed(2)}`);
  if (breakdown.localTaxAmount > 0) lines.push(`Local: $${(breakdown.localTaxAmount / 100).toFixed(2)}`);
  if (breakdown.otherTaxAmount > 0) lines.push(`Other: $${(breakdown.otherTaxAmount / 100).toFixed(2)}`);
  
  const location = [breakdown.taxCity, breakdown.taxProvince, breakdown.taxCountry]
    .filter(Boolean)
    .join(', ');
  
  return `Tax Breakdown: ${lines.join(', ')} (${location})`;
}