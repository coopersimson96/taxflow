// Tax Analytics Types
export interface TaxAnalytics {
  id: string
  period: DatePeriod
  total_sales: number
  total_tax_collected: number
  tax_rate: number
  jurisdiction_breakdown: JurisdictionTax[]
  platform_breakdown: PlatformTax[]
  product_category_breakdown: CategoryTax[]
  created_at: string
  updated_at: string
}

export interface DatePeriod {
  start_date: string
  end_date: string
  period_type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
}

export interface JurisdictionTax {
  jurisdiction_name: string
  jurisdiction_code: string
  tax_type: 'state' | 'county' | 'city' | 'district'
  tax_rate: number
  taxable_sales: number
  tax_collected: number
  exemptions: number
}

export interface PlatformTax {
  platform: 'shopify' | 'square'
  total_sales: number
  taxable_sales: number
  tax_collected: number
  order_count: number
  average_tax_rate: number
}

export interface CategoryTax {
  category_name: string
  category_id: string
  total_sales: number
  taxable_sales: number
  tax_collected: number
  tax_exempt_sales: number
  average_tax_rate: number
}

export interface TaxReport {
  id: string
  report_type: 'summary' | 'detailed' | 'jurisdiction' | 'exemption'
  period: DatePeriod
  generated_at: string
  status: 'pending' | 'completed' | 'failed'
  file_url?: string
  data: TaxReportData
}

export interface TaxReportData {
  summary: TaxSummary
  transactions: TaxTransaction[]
  exemptions: TaxExemption[]
  adjustments: TaxAdjustment[]
}

export interface TaxSummary {
  total_transactions: number
  total_sales: number
  total_tax_collected: number
  tax_exempt_sales: number
  net_tax_liability: number
  refunds_issued: number
  adjustments_made: number
}

export interface TaxTransaction {
  id: string
  platform: 'shopify' | 'square'
  platform_transaction_id: string
  transaction_date: string
  customer_id?: string
  billing_address: Address
  shipping_address?: Address
  line_items: TaxLineItem[]
  total_amount: number
  tax_amount: number
  tax_rate: number
  jurisdiction: string
  exemption_certificate?: string
  refunded: boolean
  refund_amount?: number
}

export interface TaxLineItem {
  id: string
  product_id: string
  product_name: string
  category: string
  quantity: number
  unit_price: number
  total_price: number
  tax_amount: number
  tax_rate: number
  tax_exempt: boolean
  exemption_reason?: string
}

export interface TaxExemption {
  id: string
  customer_id: string
  certificate_number: string
  exemption_type: 'resale' | 'nonprofit' | 'government' | 'other'
  jurisdiction: string
  valid_from: string
  valid_until?: string
  status: 'active' | 'expired' | 'revoked'
  documentation_url?: string
}

export interface TaxAdjustment {
  id: string
  transaction_id: string
  adjustment_type: 'credit' | 'debit' | 'correction'
  amount: number
  reason: string
  created_at: string
  created_by: string
}

export interface Address {
  line1: string
  line2?: string
  city: string
  state: string
  postal_code: string
  country: string
}

export interface TaxConfiguration {
  id: string
  business_name: string
  business_address: Address
  tax_registration_numbers: TaxRegistration[]
  nexus_jurisdictions: string[]
  default_tax_rates: DefaultTaxRate[]
  exemption_certificates: string[]
  filing_frequency: 'monthly' | 'quarterly' | 'annually'
  auto_remittance: boolean
  created_at: string
  updated_at: string
}

export interface TaxRegistration {
  jurisdiction: string
  registration_number: string
  registration_type: 'sales_tax' | 'vat' | 'gst'
  effective_date: string
}

export interface DefaultTaxRate {
  jurisdiction: string
  product_category?: string
  tax_rate: number
  effective_date: string
}

export interface DashboardMetrics {
  current_period: TaxAnalytics
  previous_period: TaxAnalytics
  year_to_date: TaxAnalytics
  upcoming_filings: TaxFiling[]
  recent_transactions: TaxTransaction[]
  alerts: TaxAlert[]
}

export interface TaxFiling {
  id: string
  jurisdiction: string
  filing_period: DatePeriod
  due_date: string
  status: 'pending' | 'filed' | 'overdue'
  estimated_liability: number
  filed_amount?: number
  filed_date?: string
}

export interface TaxAlert {
  id: string
  type: 'filing_due' | 'rate_change' | 'nexus_threshold' | 'exemption_expiry'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  action_required: boolean
  due_date?: string
  created_at: string
}