// Store information interface
export interface StoreInfo {
  storeName: string
  shopDomain?: string | null
  currency: string
  country?: string | null
}

// Enhanced Tax Dashboard Types
export interface TaxDashboardData {
  taxToSetAside: TaxToSetAsideData
  summaryMetrics: TaxSummaryMetrics
  taxBreakdown: TaxCategoryBreakdown[]
  trendData: TaxTrendData[]
  recentOrders: ShopifyOrderDetail[]
  jurisdictionData: TaxJurisdictionData[]
  periodComparison: PeriodComparison
  upcomingPayouts?: DailyPayoutData[]
  storeInfo?: StoreInfo
}

// Daily Payout Data
export interface DailyPayoutData {
  payoutDate: string
  payoutAmount: number
  ordersCount: number
  grossSales: number
  fees: number
  refunds: number
  taxCollected: number
  taxToSetAside: number
  taxBreakdown: {
    gst: number
    pst: number
    hst: number
    qst: number
    stateTax: number
    localTax: number
    other: number
  }
  orders: {
    orderNumber: string
    amount: number
    tax: number
    customer: string
  }[]
  status: 'pending' | 'in_transit' | 'paid'
  estimatedArrival?: string
}

// Main focal point - Tax Money to Set Aside
export interface TaxToSetAsideData {
  totalAmount: number
  currency: string
  periodDays: number
  recommendedSavingsRate: number
  lastCalculated: string
  breakdown: {
    federal: number
    state: number
    local: number
    gst: number
    pst: number
    hst: number
    qst: number
    other: number
  }
  // Daily payout information
  todayPayoutAmount?: number
  todayTaxAmount?: number
  todayBreakdown?: {
    gst: number
    pst: number
    hst: number
    qst: number
    stateTax: number
    localTax: number
    other: number
  }
  monthlyRollingTotal?: number
}

// Summary cards data
export interface TaxSummaryMetrics {
  totalSales: number
  totalTaxCollected: number
  averageTaxRate: number
  orderCount: number
  taxableOrderCount: number
  exemptOrderCount: number
  averageOrderValue: number
  topSellingRegion: string
  currency: string
}

// Individual tax category breakdown
export interface TaxCategoryBreakdown {
  category: 'GST' | 'PST' | 'HST' | 'QST' | 'STATE_TAX' | 'LOCAL_TAX' | 'OTHER'
  name: string
  amount: number
  rate: number
  applicableOrders: number
  totalTaxableAmount: number
  jurisdiction?: string
  color: string
}

// Time-series data for trends
export interface TaxTrendData {
  date: string
  totalSales: number
  taxCollected: number
  taxRate: number
  orderCount: number
  gst: number
  pst: number
  hst: number
  qst: number
  stateTax: number
  localTax: number
  other: number
}

// Detailed Shopify order information
export interface ShopifyOrderDetail {
  id: string
  orderNumber: string
  date: string
  subtotal: number
  totalTax: number
  totalAmount: number
  currency: string
  customerName?: string
  customerEmail?: string
  taxBreakdown: {
    gst: number
    pst: number
    hst: number
    qst: number
    stateTax: number
    localTax: number
    other: number
  }
  jurisdiction: {
    country: string
    province?: string
    state?: string
    city?: string
    postalCode?: string
  }
  items: OrderItem[]
  taxExempt: boolean
  exemptionReason?: string
}

export interface OrderItem {
  id: string
  productName: string
  quantity: number
  unitPrice: number
  totalPrice: number
  taxAmount: number
  taxable: boolean
}

// Tax by jurisdiction
export interface TaxJurisdictionData {
  jurisdiction: string
  country: string
  state?: string
  province?: string
  city?: string
  totalSales: number
  totalTax: number
  orderCount: number
  taxRate: number
  breakdown: {
    gst: number
    pst: number
    hst: number
    qst: number
    stateTax: number
    localTax: number
    other: number
  }
}

// Period comparison data
export interface PeriodComparison {
  current: PeriodData
  previous: PeriodData
  yearOverYear?: PeriodData
}

export interface PeriodData {
  totalSales: number
  totalTax: number
  orderCount: number
  averageOrderValue: number
  taxRate: number
  startDate: string
  endDate: string
}

// Chart configuration
export interface ChartConfig {
  colors: {
    primary: string
    secondary: string
    gst: string
    pst: string
    hst: string
    qst: string
    stateTax: string
    localTax: string
    other: string
  }
  gradients: {
    primary: string[]
    tax: string[]
  }
}

// API response types
export interface TaxDashboardResponse {
  success: boolean
  data: TaxDashboardData
  lastUpdated: string
  error?: string
}

// Filter and date range options
export interface DashboardFilters {
  dateRange: {
    start: string
    end: string
    preset?: 'today' | '7days' | '30days' | '90days' | '1year' | 'custom'
  }
  jurisdiction?: string[]
  taxCategory?: string[]
  orderStatus?: 'all' | 'completed' | 'pending' | 'cancelled'
  includeRefunds: boolean
}

// Loading and error states
export interface DashboardState {
  isLoading: boolean
  error?: string
  lastRefresh: string
  dataFreshness: 'fresh' | 'stale' | 'outdated'
}

// Props for dashboard components
export interface TaxHeroSectionProps {
  data: TaxToSetAsideData
  isLoading?: boolean
}

export interface TaxSummaryCardsProps {
  metrics: TaxSummaryMetrics
  comparison?: PeriodComparison
  isLoading?: boolean
}

export interface TaxBreakdownProps {
  breakdown: TaxCategoryBreakdown[]
  isLoading?: boolean
}

export interface TaxTrendsChartProps {
  data: TaxTrendData[]
  config: ChartConfig
  isLoading?: boolean
}

export interface OrderBreakdownProps {
  orders: ShopifyOrderDetail[]
  isLoading?: boolean
}

// Utility types
export type TaxCategory = TaxCategoryBreakdown['category']
export type CurrencyCode = 'USD' | 'CAD' | 'GBP' | 'EUR'
export type ChartTimeRange = '7d' | '30d' | '90d' | '1y'