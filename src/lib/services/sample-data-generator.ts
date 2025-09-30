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

  private static readonly SAMPLE_LOCATIONS = [
    { city: 'New York', province: 'New York', province_code: 'NY', country: 'United States', country_code: 'US', zip: '10001', tax_rate: 0.08875 },
    { city: 'Los Angeles', province: 'California', province_code: 'CA', country: 'United States', country_code: 'US', zip: '90210', tax_rate: 0.0975 },
    { city: 'Toronto', province: 'Ontario', province_code: 'ON', country: 'Canada', country_code: 'CA', zip: 'M5V 3A8', tax_rate: 0.13 },
    { city: 'Austin', province: 'Texas', province_code: 'TX', country: 'United States', country_code: 'US', zip: '73301', tax_rate: 0.0825 },
    { city: 'Seattle', province: 'Washington', province_code: 'WA', country: 'United States', country_code: 'US', zip: '98101', tax_rate: 0.101 }
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
      const taxAmount = itemTotal * location.tax_rate;

      lineItems.push({
        id: orderId * 100 + i,
        title: product.title,
        quantity,
        variant_title: 'Default',
        price: product.price.toFixed(2),
        total_price: itemTotal.toFixed(2),
        tax_lines: [{
          title: `${location.province_code} Tax`,
          rate: location.tax_rate,
          price: taxAmount.toFixed(2)
        }],
        product_id: product.id,
        product_title: product.title
      });

      subtotal += itemTotal;
    }

    // Calculate shipping (10% of orders have free shipping)
    const shippingCost = Math.random() < 0.1 ? 0 : 8.99;
    const shippingTax = shippingCost * location.tax_rate;
    
    // Calculate totals
    const totalTax = lineItems.reduce((sum, item) => sum + parseFloat(item.tax_lines[0].price), 0) + shippingTax;
    const totalPrice = subtotal + shippingCost + totalTax;

    return {
      id: orderId,
      name: `#SO${orderId}`,
      created_at: orderTime.toISOString(),
      updated_at: orderTime.toISOString(),
      total_price: totalPrice.toFixed(2),
      subtotal_price: subtotal.toFixed(2),
      total_tax: totalTax.toFixed(2),
      currency: 'USD',
      financial_status: 'paid',
      fulfillment_status: Math.random() < 0.8 ? 'fulfilled' : 'unfulfilled',
      cancel_reason: null,
      cancelled_at: null,
      line_items: lineItems,
      shipping_lines: shippingCost > 0 ? [{
        title: 'Standard Shipping',
        price: shippingCost.toFixed(2),
        tax_lines: [{
          title: `${location.province_code} Tax`,
          rate: location.tax_rate,
          price: shippingTax.toFixed(2)
        }]
      }] : [],
      tax_lines: [{
        title: `${location.province_code} Tax`,
        rate: location.tax_rate,
        price: totalTax.toFixed(2)
      }],
      billing_address: location,
      shipping_address: location,
      refunds: []
    };
  }

  /**
   * Check if we should use sample data (when APIs are restricted)
   */
  static shouldUseSampleData(): boolean {
    // Use sample data in development or when explicitly enabled
    return process.env.NODE_ENV === 'development' || 
           process.env.USE_SAMPLE_DATA === 'true' ||
           process.env.SHOPIFY_USE_SAMPLE_DATA === 'true';
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