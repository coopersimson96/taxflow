// Square API Types
export interface SquarePayment {
  id: string
  created_at: string
  updated_at: string
  amount_money: SquareMoney
  tip_money?: SquareMoney
  total_money: SquareMoney
  app_fee_money?: SquareMoney
  processing_fee?: SquareProcessingFee[]
  refunded_money?: SquareMoney
  status: string
  delay_duration?: string
  source_type: string
  card_details?: SquareCardDetails
  location_id: string
  order_id?: string
  reference_id?: string
  customer_id?: string
  employee_id?: string
  refund_ids?: string[]
  risk_evaluation?: SquareRiskEvaluation
  buyer_email_address?: string
  billing_address?: SquareAddress
  shipping_address?: SquareAddress
  note?: string
  statement_description_identifier?: string
  capabilities?: string[]
  receipt_number?: string
  receipt_url?: string
  device_details?: SquareDeviceDetails
  application_details?: SquareApplicationDetails
  version_token?: string
}

export interface SquareMoney {
  amount: number
  currency: string
}

export interface SquareProcessingFee {
  effective_at: string
  type: string
  amount_money: SquareMoney
}

export interface SquareCardDetails {
  status: string
  card: SquareCard
  entry_method: string
  cvv_status: string
  avs_status: string
  auth_result_code: string
  application_identifier?: string
  application_name?: string
  application_cryptogram?: string
  verification_method?: string
  verification_results?: string
  statement_description?: string
  device_details?: SquareDeviceDetails
  refund_requires_card_presence?: boolean
  errors?: SquareError[]
}

export interface SquareCard {
  card_brand: string
  last_4: string
  exp_month: number
  exp_year: number
  cardholder_name?: string
  billing_address?: SquareAddress
  fingerprint?: string
  customer_id?: string
  merchant_id?: string
  reference_id?: string
  enabled?: boolean
  card_type: string
  prepaid_type?: string
  bin?: string
}

export interface SquareAddress {
  address_line_1?: string
  address_line_2?: string
  address_line_3?: string
  locality?: string
  sublocality?: string
  sublocality_2?: string
  sublocality_3?: string
  administrative_district_level_1?: string
  administrative_district_level_2?: string
  administrative_district_level_3?: string
  postal_code?: string
  country?: string
  first_name?: string
  last_name?: string
  organization?: string
}

export interface SquareRiskEvaluation {
  created_at: string
  risk_level: string
}

export interface SquareDeviceDetails {
  device_id?: string
  device_installation_id?: string
  device_name?: string
}

export interface SquareApplicationDetails {
  square_product: string
  application_id?: string
}

export interface SquareError {
  category: string
  code: string
  detail?: string
  field?: string
}

export interface SquareOrder {
  id: string
  location_id: string
  reference_id?: string
  source: SquareOrderSource
  customer_id?: string
  line_items?: SquareOrderLineItem[]
  taxes?: SquareOrderTax[]
  discounts?: SquareOrderDiscount[]
  service_charges?: SquareOrderServiceCharge[]
  fulfillments?: SquareOrderFulfillment[]
  returns?: SquareOrderReturn[]
  return_amounts?: SquareOrderMoneyAmounts
  net_amounts: SquareOrderMoneyAmounts
  rounding_adjustment?: SquareOrderRoundingAdjustment
  tenders?: SquareOrderTender[]
  refunds?: SquareOrderRefund[]
  metadata?: Record<string, string>
  created_at: string
  updated_at: string
  closed_at?: string
  state: string
  version: number
  total_money?: SquareMoney
  total_tax_money?: SquareMoney
  total_discount_money?: SquareMoney
  total_tip_money?: SquareMoney
  total_service_charge_money?: SquareMoney
  pricing_options?: SquareOrderPricingOptions
  rewards?: SquareOrderReward[]
}

export interface SquareOrderSource {
  name?: string
}

export interface SquareOrderLineItem {
  uid?: string
  name?: string
  quantity: string
  item_type?: string
  base_price_money?: SquareMoney
  variation_total_price_money?: SquareMoney
  gross_sales_money?: SquareMoney
  total_tax_money?: SquareMoney
  total_discount_money?: SquareMoney
  total_money?: SquareMoney
  catalog_object_id?: string
  catalog_version?: number
  item_variation_name?: string
  metadata?: Record<string, string>
  modifiers?: SquareOrderLineItemModifier[]
  taxes?: SquareOrderLineItemTax[]
  discounts?: SquareOrderLineItemDiscount[]
  applied_taxes?: SquareOrderLineItemAppliedTax[]
  applied_discounts?: SquareOrderLineItemAppliedDiscount[]
  applied_service_charges?: SquareOrderLineItemAppliedServiceCharge[]
  note?: string
}

export interface SquareOrderTax {
  uid?: string
  catalog_object_id?: string
  catalog_version?: number
  name?: string
  type?: string
  percentage?: string
  metadata?: Record<string, string>
  applied_money?: SquareMoney
  scope?: string
}

export interface SquareOrderDiscount {
  uid?: string
  catalog_object_id?: string
  catalog_version?: number
  name?: string
  type?: string
  percentage?: string
  amount_money?: SquareMoney
  applied_money?: SquareMoney
  metadata?: Record<string, string>
  scope?: string
  reward_ids?: string[]
  pricing_rule_id?: string
}

export interface SquareOrderServiceCharge {
  uid?: string
  name?: string
  catalog_object_id?: string
  catalog_version?: number
  percentage?: string
  amount_money?: SquareMoney
  applied_money?: SquareMoney
  total_money?: SquareMoney
  total_tax_money?: SquareMoney
  calculation_phase?: string
  taxable?: boolean
  applied_taxes?: SquareOrderLineItemAppliedTax[]
  metadata?: Record<string, string>
  type?: string
  treatment_type?: string
  scope?: string
}

export interface SquareOrderFulfillment {
  uid?: string
  type: string
  state: string
  line_item_application?: string
  entries?: SquareOrderFulfillmentEntry[]
  metadata?: Record<string, string>
  pickup_details?: SquareOrderFulfillmentPickupDetails
  shipment_details?: SquareOrderFulfillmentShipmentDetails
}

export interface SquareOrderReturn {
  uid?: string
  source_order_id?: string
  return_line_items?: SquareOrderReturnLineItem[]
  return_service_charges?: SquareOrderReturnServiceCharge[]
  return_taxes?: SquareOrderReturnTax[]
  return_discounts?: SquareOrderReturnDiscount[]
  rounding_adjustment?: SquareOrderRoundingAdjustment
  return_amounts?: SquareOrderMoneyAmounts
}

export interface SquareOrderMoneyAmounts {
  total_money?: SquareMoney
  tax_money?: SquareMoney
  discount_money?: SquareMoney
  tip_money?: SquareMoney
  service_charge_money?: SquareMoney
}

export interface SquareOrderRoundingAdjustment {
  uid?: string
  name?: string
  amount_money?: SquareMoney
}

export interface SquareOrderTender {
  id?: string
  location_id?: string
  transaction_id?: string
  created_at?: string
  note?: string
  amount_money?: SquareMoney
  tip_money?: SquareMoney
  processing_fee_money?: SquareMoney
  customer_id?: string
  type: string
  card_details?: SquareOrderTenderCardDetails
  cash_details?: SquareOrderTenderCashDetails
  additional_recipients?: SquareAdditionalRecipient[]
  payment_id?: string
}

export interface SquareOrderRefund {
  id: string
  location_id: string
  transaction_id?: string
  tender_id: string
  created_at: string
  reason: string
  amount_money: SquareMoney
  status: string
  processing_fee_money?: SquareMoney
  additional_recipients?: SquareAdditionalRecipient[]
}

export interface SquareOrderPricingOptions {
  auto_apply_discounts?: boolean
  auto_apply_taxes?: boolean
}

export interface SquareOrderReward {
  id: string
  reward_tier_id: string
}

export interface SquareOrderLineItemModifier {
  uid?: string
  catalog_object_id?: string
  catalog_version?: number
  name?: string
  quantity?: string
  base_price_money?: SquareMoney
  total_price_money?: SquareMoney
  metadata?: Record<string, string>
}

export interface SquareOrderLineItemTax {
  uid?: string
  catalog_object_id?: string
  catalog_version?: number
  name?: string
  type?: string
  percentage?: string
  metadata?: Record<string, string>
  applied_money?: SquareMoney
  scope?: string
}

export interface SquareOrderLineItemDiscount {
  uid?: string
  catalog_object_id?: string
  catalog_version?: number
  name?: string
  type?: string
  percentage?: string
  amount_money?: SquareMoney
  applied_money?: SquareMoney
  metadata?: Record<string, string>
  scope?: string
  reward_ids?: string[]
  pricing_rule_id?: string
}

export interface SquareOrderLineItemAppliedTax {
  uid?: string
  tax_uid: string
  applied_money?: SquareMoney
}

export interface SquareOrderLineItemAppliedDiscount {
  uid?: string
  discount_uid: string
  applied_money?: SquareMoney
}

export interface SquareOrderLineItemAppliedServiceCharge {
  uid?: string
  service_charge_uid: string
  applied_money?: SquareMoney
}

export interface SquareOrderFulfillmentEntry {
  uid?: string
  line_item_uid: string
  quantity: string
  metadata?: Record<string, string>
}

export interface SquareOrderFulfillmentPickupDetails {
  recipient?: SquareOrderFulfillmentRecipient
  expires_at?: string
  auto_complete_duration?: string
  schedule_type?: string
  pickup_at?: string
  pickup_window_duration?: string
  prep_time_duration?: string
  note?: string
  placed_at?: string
  accepted_at?: string
  rejected_at?: string
  ready_at?: string
  expired_at?: string
  picked_up_at?: string
  canceled_at?: string
  cancel_reason?: string
  is_curbside_pickup?: boolean
  curbside_pickup_details?: SquareOrderFulfillmentPickupDetailsCurbsidePickupDetails
}

export interface SquareOrderFulfillmentShipmentDetails {
  recipient?: SquareOrderFulfillmentRecipient
  carrier?: string
  shipping_note?: string
  shipping_type?: string
  tracking_number?: string
  tracking_url?: string
  placed_at?: string
  in_progress_at?: string
  packaged_at?: string
  expected_shipped_at?: string
  shipped_at?: string
  canceled_at?: string
  cancel_reason?: string
  failed_at?: string
  failure_reason?: string
}

export interface SquareOrderFulfillmentRecipient {
  customer_id?: string
  display_name?: string
  email_address?: string
  phone_number?: string
  address?: SquareAddress
}

export interface SquareOrderFulfillmentPickupDetailsCurbsidePickupDetails {
  curbside_details?: string
  buyer_arrived_at?: string
}

export interface SquareOrderReturnLineItem {
  uid?: string
  source_line_item_uid?: string
  name?: string
  quantity: string
  item_type?: string
  return_modifiers?: SquareOrderReturnModifier[]
  applied_taxes?: SquareOrderLineItemAppliedTax[]
  applied_discounts?: SquareOrderLineItemAppliedDiscount[]
  base_price_money?: SquareMoney
  variation_total_price_money?: SquareMoney
  gross_return_money?: SquareMoney
  total_tax_money?: SquareMoney
  total_discount_money?: SquareMoney
  total_money?: SquareMoney
  applied_service_charges?: SquareOrderLineItemAppliedServiceCharge[]
  catalog_object_id?: string
  catalog_version?: number
  item_variation_name?: string
  note?: string
  metadata?: Record<string, string>
}

export interface SquareOrderReturnServiceCharge {
  uid?: string
  source_service_charge_uid?: string
  name?: string
  catalog_object_id?: string
  catalog_version?: number
  percentage?: string
  amount_money?: SquareMoney
  applied_money?: SquareMoney
  total_money?: SquareMoney
  total_tax_money?: SquareMoney
  calculation_phase?: string
  taxable?: boolean
  applied_taxes?: SquareOrderLineItemAppliedTax[]
  treatment_type?: string
  scope?: string
}

export interface SquareOrderReturnTax {
  uid?: string
  source_tax_uid?: string
  catalog_object_id?: string
  catalog_version?: number
  name?: string
  type?: string
  percentage?: string
  applied_money?: SquareMoney
  scope?: string
}

export interface SquareOrderReturnDiscount {
  uid?: string
  source_discount_uid?: string
  catalog_object_id?: string
  catalog_version?: number
  name?: string
  type?: string
  percentage?: string
  amount_money?: SquareMoney
  applied_money?: SquareMoney
  scope?: string
}

export interface SquareOrderReturnModifier {
  uid?: string
  source_modifier_uid?: string
  catalog_object_id?: string
  catalog_version?: number
  name?: string
  base_price_money?: SquareMoney
  total_price_money?: SquareMoney
  quantity?: string
}

export interface SquareOrderTenderCardDetails {
  status?: string
  card?: SquareCard
  entry_method?: string
}

export interface SquareOrderTenderCashDetails {
  buyer_tendered_money?: SquareMoney
  change_back_money?: SquareMoney
}

export interface SquareAdditionalRecipient {
  location_id: string
  description: string
  amount_money: SquareMoney
  receivable_id?: string
}

export interface SquareApiCredentials {
  application_id: string
  access_token: string
  environment: 'sandbox' | 'production'
  location_id: string
}