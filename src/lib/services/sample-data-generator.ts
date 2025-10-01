/**
 * Sample Data Generator for Development and Testing
 * 
 * ⚠️  CRITICAL: REMOVE THIS ENTIRE FILE BEFORE SHOPIFY SUBMISSION ⚠️
 * This is ONLY for development when Shopify APIs are restricted.
 * Before going live, revert to GraphQL/REST API and remove all sample data code.
 * 
 * TODO: BEFORE SHOPIFY SUBMISSION - DELETE THIS FILE AND ALL REFERENCES
 * 
 * Generates realistic order and tax data when Shopify APIs are restricted.
 * This allows full app testing without protected customer data approval.
 */

interface SampleOrder {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  total_price: string;
  subtotal_price: string;
  total_tax: string;
  currency: string;
  financial_status: string;
  fulfillment_status: string;
  cancel_reason: null | string;
  cancelled_at: null | string;
  line_items: SampleLineItem[];
  shipping_lines: SampleShippingLine[];
  tax_lines: SampleTaxLine[];
  billing_address: SampleAddress;
  shipping_address: SampleAddress;
  refunds: any[];
}

interface SampleLineItem {
  id: number;
  title: string;
  quantity: number;
  variant_title: string;
  price: string;
  total_price: string;
  tax_lines: SampleTaxLine[];
  product_id: number;
  product_title: string;
}

interface SampleShippingLine {
  title: string;
  price: string;
  tax_lines: SampleTaxLine[];
}

interface SampleTaxLine {
  title: string;
  rate: number;
  price: string;
}

interface SampleAddress {
  city: string;
  province: string;
  province_code: string;
  country: string;
  country_code: string;
  zip: string;
}

export class SampleDataGenerator {
  private static readonly SAMPLE_PRODUCTS = [
    { id: 1001, title: 'Premium Coffee Beans', price: 24.99 },
    { id: 1002, title: 'Organic Tea Set', price: 34.50 },
    { id: 1003, title: 'Artisan Chocolate Box', price: 18.75 },
    { id: 1004, title: 'Gourmet Spice Collection', price: 42.00 },
    { id: 1005, title: 'Bamboo Kitchen Set', price: 89.99 },
    { id: 1006, title: 'Ceramic Coffee Mug', price: 15.99 },
    { id: 1007, title: 'Steel Water Bottle', price: 29.99 },
    { id: 1008, title: 'Eco-Friendly Tote Bag', price: 12.50 }
  ];

  // Canadian tax rates as of 2024
  // HST: Harmonized Sales Tax (combined federal + provincial)
  // GST: Goods and Services Tax (federal)
  // PST: Provincial Sales Tax
  private static readonly CANADIAN_TAX_CONFIG = {
    // HST provinces
    ON: { province: 'Ontario', hst: 0.13, gst: 0, pst: 0 },
    NS: { province: 'Nova Scotia', hst: 0.15, gst: 0, pst: 0 },
    NB: { province: 'New Brunswick', hst: 0.15, gst: 0, pst: 0 },
    NL: { province: 'Newfoundland and Labrador', hst: 0.15, gst: 0, pst: 0 },
    PE: { province: 'Prince Edward Island', hst: 0.15, gst: 0, pst: 0 },
    
    // GST + PST provinces
    BC: { province: 'British Columbia', hst: 0, gst: 0.05, pst: 0.07 },
    SK: { province: 'Saskatchewan', hst: 0, gst: 0.05, pst: 0.06 },
    MB: { province: 'Manitoba', hst: 0, gst: 0.05, pst: 0.07 },
    QC: { province: 'Quebec', hst: 0, gst: 0.05, pst: 0.09975 }, // QST instead of PST
    
    // GST only territories
    AB: { province: 'Alberta', hst: 0, gst: 0.05, pst: 0 },
    NT: { province: 'Northwest Territories', hst: 0, gst: 0.05, pst: 0 },
    NU: { province: 'Nunavut', hst: 0, gst: 0.05, pst: 0 },
    YT: { province: 'Yukon', hst: 0, gst: 0.05, pst: 0 }
  };

  private static readonly SAMPLE_LOCATIONS = [
    // Canadian locations with proper tax structure
    { city: 'Toronto', province: 'Ontario', province_code: 'ON', country: 'Canada', country_code: 'CA', zip: 'M5V 3A8' },
    { city: 'Vancouver', province: 'British Columbia', province_code: 'BC', country: 'Canada', country_code: 'CA', zip: 'V6B 4Y8' },
    { city: 'Montreal', province: 'Quebec', province_code: 'QC', country: 'Canada', country_code: 'CA', zip: 'H2Y 1A6' },
    { city: 'Calgary', province: 'Alberta', province_code: 'AB', country: 'Canada', country_code: 'CA', zip: 'T2P 0L4' },
    { city: 'Halifax', province: 'Nova Scotia', province_code: 'NS', country: 'Canada', country_code: 'CA', zip: 'B3J 1P3' },
    { city: 'Winnipeg', province: 'Manitoba', province_code: 'MB', country: 'Canada', country_code: 'CA', zip: 'R3B 0T6' },
    { city: 'Regina', province: 'Saskatchewan', province_code: 'SK', country: 'Canada', country_code: 'CA', zip: 'S4P 3A3' },
    { city: 'Charlottetown', province: 'Prince Edward Island', province_code: 'PE', country: 'Canada', country_code: 'CA', zip: 'C1A 4P3' }
  ];

  /**
   * Generate sample orders for development and testing
   */
  static generateSampleOrders(
    startDate: Date,
    endDate: Date,
    maxOrders: number = 100
  ): SampleOrder[] {
    const orders: SampleOrder[] = [];
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Generate 1-5 orders per day on average
    const ordersPerDay = Math.min(5, Math.max(1, maxOrders / daysDiff));
    
    console.log(`🎲 Generating ~${ordersPerDay} sample orders per day for ${daysDiff} days (max: ${maxOrders})`)

    for (let day = 0; day < daysDiff && orders.length < maxOrders; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + day);
      
      // Skip some days randomly to make it realistic
      if (Math.random() < 0.3) continue;
      
      const dailyOrders = Math.floor(Math.random() * ordersPerDay) + 1;
      
      for (let i = 0; i < dailyOrders && orders.length < maxOrders; i++) {
        orders.push(this.generateSingleOrder(currentDate, orders.length + 1000));
      }
    }

    console.log(`✅ Generated ${orders.length} sample orders`)
    return orders.slice(0, maxOrders);
  }

  /**
   * Generate a single realistic order
   */
  private static generateSingleOrder(date: Date, orderId: number): SampleOrder {
    const location = this.SAMPLE_LOCATIONS[Math.floor(Math.random() * this.SAMPLE_LOCATIONS.length)];
    const orderTime = new Date(date);
    orderTime.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

    // Generate 1-4 line items per order
    const lineItemCount = Math.floor(Math.random() * 4) + 1;
    const lineItems: SampleLineItem[] = [];
    let subtotal = 0;

    for (let i = 0; i < lineItemCount; i++) {
      const product = this.SAMPLE_PRODUCTS[Math.floor(Math.random() * this.SAMPLE_PRODUCTS.length)];
      const quantity = Math.floor(Math.random() * 3) + 1;
      const itemTotal = product.price * quantity;
      
      // Generate Canadian tax lines based on province
      const taxLines = this.generateCanadianTaxLines(location.province_code, itemTotal);
      const totalItemTax = taxLines.reduce((sum, line) => sum + parseFloat(line.price), 0);

      lineItems.push({
        id: orderId * 100 + i,
        title: product.title,
        quantity,
        variant_title: 'Default',
        price: product.price.toFixed(2),
        total_price: itemTotal.toFixed(2),
        tax_lines: taxLines,
        product_id: product.id,
        product_title: product.title
      });

      subtotal += itemTotal;
    }

    // Calculate shipping (10% of orders have free shipping)
    const shippingCost = Math.random() < 0.1 ? 0 : 8.99;
    const shippingTaxLines = shippingCost > 0 ? this.generateCanadianTaxLines(location.province_code, shippingCost) : [];
    
    // Calculate total taxes from all line items and shipping
    const totalItemTax = lineItems.reduce((sum, item) => 
      sum + item.tax_lines.reduce((lineSum, tax) => lineSum + parseFloat(tax.price), 0), 0
    );
    const totalShippingTax = shippingTaxLines.reduce((sum, line) => sum + parseFloat(line.price), 0);
    const totalTax = totalItemTax + totalShippingTax;
    
    const totalPrice = subtotal + shippingCost + totalTax;

    // Generate order-level tax lines (aggregate of all taxes)
    const orderTaxLines = this.aggregateCanadianTaxLines(location.province_code, totalItemTax + totalShippingTax);

    return {
      id: orderId,
      name: `#SO${orderId}`,
      created_at: orderTime.toISOString(),
      updated_at: orderTime.toISOString(),
      total_price: totalPrice.toFixed(2),
      subtotal_price: subtotal.toFixed(2),
      total_tax: totalTax.toFixed(2),
      currency: 'CAD', // Canadian dollars
      financial_status: 'paid',
      fulfillment_status: Math.random() < 0.8 ? 'fulfilled' : 'unfulfilled',
      cancel_reason: null,
      cancelled_at: null,
      line_items: lineItems,
      shipping_lines: shippingCost > 0 ? [{
        title: 'Standard Shipping',
        price: shippingCost.toFixed(2),
        tax_lines: shippingTaxLines
      }] : [],
      tax_lines: orderTaxLines,
      billing_address: location,
      shipping_address: location,
      refunds: []
    };
  }

  /**
   * Generate Canadian tax lines based on province
   */
  private static generateCanadianTaxLines(provinceCode: string, amount: number): SampleTaxLine[] {
    const taxConfig = this.CANADIAN_TAX_CONFIG[provinceCode as keyof typeof this.CANADIAN_TAX_CONFIG];
    if (!taxConfig) return [];

    const taxLines: SampleTaxLine[] = [];

    // HST provinces (single combined tax)
    if (taxConfig.hst > 0) {
      taxLines.push({
        title: `HST ${(taxConfig.hst * 100).toFixed(0)}%`,
        rate: taxConfig.hst,
        price: (amount * taxConfig.hst).toFixed(2)
      });
    } else {
      // GST + PST provinces (separate taxes)
      if (taxConfig.gst > 0) {
        taxLines.push({
          title: `GST ${(taxConfig.gst * 100).toFixed(0)}%`,
          rate: taxConfig.gst,
          price: (amount * taxConfig.gst).toFixed(2)
        });
      }

      if (taxConfig.pst > 0) {
        const pstTitle = provinceCode === 'QC' ? 'QST' : 'PST';
        taxLines.push({
          title: `${pstTitle} ${(taxConfig.pst * 100).toFixed(2)}%`,
          rate: taxConfig.pst,
          price: (amount * taxConfig.pst).toFixed(2)
        });
      }
    }

    return taxLines;
  }

  /**
   * Aggregate Canadian tax lines for order-level display
   */
  private static aggregateCanadianTaxLines(provinceCode: string, totalTaxAmount: number): SampleTaxLine[] {
    const taxConfig = this.CANADIAN_TAX_CONFIG[provinceCode as keyof typeof this.CANADIAN_TAX_CONFIG];
    if (!taxConfig) return [];

    const taxLines: SampleTaxLine[] = [];
    const totalRate = taxConfig.hst || (taxConfig.gst + taxConfig.pst);

    // For order-level, show breakdown of total tax collected
    if (taxConfig.hst > 0) {
      taxLines.push({
        title: `HST (${provinceCode})`,
        rate: taxConfig.hst,
        price: totalTaxAmount.toFixed(2)
      });
    } else {
      if (taxConfig.gst > 0) {
        const gstPortion = (totalTaxAmount * taxConfig.gst / totalRate);
        taxLines.push({
          title: `GST`,
          rate: taxConfig.gst,
          price: gstPortion.toFixed(2)
        });
      }

      if (taxConfig.pst > 0) {
        const pstPortion = (totalTaxAmount * taxConfig.pst / totalRate);
        const pstTitle = provinceCode === 'QC' ? 'QST' : 'PST';
        taxLines.push({
          title: `${pstTitle} (${provinceCode})`,
          rate: taxConfig.pst,
          price: pstPortion.toFixed(2)
        });
      }
    }

    return taxLines;
  }

  /**
   * Check if we should use sample data (when APIs are restricted)
   * 
   * IMPORTANT: This is a temporary solution for development/testing only.
   * The proper fix is to submit the app to Shopify for protected data approval.
   */
  static shouldUseSampleData(): boolean {
    // Only use sample data when explicitly enabled via environment variable
    // This ensures we don't accidentally use sample data in production
    return process.env.USE_SAMPLE_DATA === 'true';
  }

  /**
   * Generate sample import progress for testing
   */
  static generateSampleImportProgress(integrationId: string, orderCount: number) {
    return {
      integrationId,
      status: 'completed' as const,
      totalOrders: orderCount,
      processedOrders: orderCount,
      startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
      endDate: new Date(),
      error: undefined
    };
  }

  /**
   * Log sample data usage for debugging
   */
  static logSampleDataUsage(context: string, orderCount: number) {
    console.log(`🎲 [${context}] Using sample data - generated ${orderCount} orders`);
    console.log(`💡 To use real Shopify data, set SHOPIFY_USE_SAMPLE_DATA=false or deploy to production with approved app`);
  }
}