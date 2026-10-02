// ============================================
// StartupSphere — Shared TypeScript Types
// Mirrors Supabase schema for type safety
// ============================================

// ---- Auth & Profile ----

export type UserRole = "owner" | "employee"

export interface Profile {
  id: string
  full_name: string | null
  company_name: string
  role: UserRole
  base_currency: string | null
  email: string | null
  gstin: string | null
  address: string | null
  phone: string | null
  website: string | null
  description: string | null
  owner_id: string | null
  can_manage_inventory: boolean
  can_manage_sales: boolean
  can_manage_accounting: boolean
  is_super_admin?: boolean
  plan_id: string | null
  // Packs based system
  has_sales_pack: boolean
  has_multi_tenancy_pack: boolean
  has_core_modules_pack: boolean
  has_ai_analysis_pack: boolean
  has_crm_pack: boolean
  max_employees: number
  max_locations: number
  branding_settings?: any
  // Phase 4: Multi-Currency & Branch
  currency?: string | null
  currency_symbol?: string | null
  currency_rate?: number | null
  currency_updated_at?: string | null
  active_branch_id?: string | null
  created_at: string
}

// ---- Products & Inventory ----

export interface Product {
  id: string
  owner_id: string
  name: string
  sku: string
  description: string | null
  price: number
  cost_price: number | null
  stock_quantity: number
  min_stock_level: number
  category: string | null
  manufacturer: string | null
  purchase_gst: number | null
  created_at: string
  updated_at: string
}

// ---- Sales ----

export type OrderStatus = "pending" | "completed" | "cancelled" | "refunded"

export interface SalesOrder {
  id: string
  owner_id: string
  created_by: string
  order_date: string
  total_amount: number
  gst_amount: number
  status: OrderStatus
  customer_name: string | null
  customer_phone?: string | null
  customer_email?: string | null
  customer_id?: string | null
  amount_paid?: number
  balance_due?: number
  payment_status?: 'unpaid' | 'partial' | 'paid' | 'advance'
  notes: string | null
  location_id: string | null
  created_at: string
  order_items?: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  quantity: number
  unit_price: number
  line_total: number
  products?: Pick<Product, "name">
}

// ---- Expenses ----

export interface Expense {
  id: string
  owner_id: string
  category: string
  description: string | null
  amount: number
  expense_date: string
  receipt_url: string | null
  gst_applicable: boolean
  gst_amount: number
  tax_filing_category?: string | null
  location_id: string | null
  manufacturer_id?: string | null
  amount_paid?: number
  balance_due?: number
  payment_status?: 'unpaid' | 'partial' | 'paid'
  itc_eligible: boolean
  created_at: string
}

// ---- Invoices ----

export type InvoiceStatus = "draft" | "issued" | "paid" | "cancelled"

export interface Invoice {
  id: string
  owner_id: string
  invoice_number: string
  order_id: string | null
  customer_name: string
  customer_company: string | null
  customer_gst_no: string | null
  customer_phone?: string | null
  customer_email?: string | null
  issue_date: string
  due_date: string | null
  subtotal: number
  gst_rate: number
  gst_amount: number
  total_amount: number
  status: InvoiceStatus
  location_id: string | null
  created_at: string
  updated_at: string
  sales_orders?: SalesOrder
}

// ---- Employees ----

export type RequestStatus = "pending" | "approved" | "rejected"

export interface EmployeeRequest {
  id: string
  owner_email: string
  employee_email: string
  employee_password_hash: string
  status: RequestStatus
  created_at: string
}

// ---- Notifications ----

export interface Notification {
  id: string
  owner_id: string
  user_id: string
  action_type: string
  entity_type: string
  entity_id: string | null
  message: string
  is_read: boolean
  created_at: string
}

// ---- Subscriptions & Memberships ----

export type SubscriptionStatus = "active" | "expired" | "cancelled"

export interface Membership {
  id: string
  plan_name: string
  price_inr: number
  duration_days: number
  features: string[] | null
  created_at: string
}

export interface UserSubscription {
  id: string
  user_id: string
  membership_id: string
  start_date: string
  end_date: string | null
  status: SubscriptionStatus
  created_at: string
  memberships?: Membership
}

export interface MembershipRequest {
  id: string
  owner_id: string
  requested_packs: string[]
  status: "pending" | "approved" | "rejected"
  admin_notes: string | null
  created_at: string
  updated_at: string
  profiles?: Profile
}

// ---- AI Marketing ----

export interface AIMarketingRequest {
  id: string
  owner_id: string
  product_name: string
  campaign_brief: string | null
  captions: string[] | null
  reel_concepts: string[] | null
  hashtags: string[] | null
  created_at: string
}

// ---- Dashboard Stats ----

export interface DashboardStats {
  totalProducts: number
  totalOrders: number
  totalRevenue: number
  totalExpenses: number
  monthlyOrders: number
  monthlyRevenue: number
  monthlyExpenses: number
  lowStockProducts: Product[]
}

// ---- Notification Payload (for sendNotification) ----

export interface NotificationPayload {
  actionType: string
  entityType: string
  entityId: string
  message: string
  ownerId: string
  userId: string
}

// ---- CRM: Contacts & Companies ----

export interface Company {
  id: string
  owner_id: string
  name: string
  industry: string | null
  website: string | null
  phone: string | null
  address: string | null
  size: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Contact {
  id: string
  owner_id: string
  first_name: string
  last_name: string | null
  email: string | null
  phone: string | null
  company_id: string | null
  job_title: string | null
  lead_source: string | null
  lead_status: string
  lead_score: number
  tags: string[] | null
  lifecycle_stage: string
  last_contact_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
  companies?: Company
}

// ---- CRM: Deals & Pipelines ----

export interface PipelineStage {
  id: string
  owner_id: string | null
  name: string
  order_index: number
  probability: number
  is_default: boolean
  created_at: string
}

export interface Deal {
  id: string
  owner_id: string
  contact_id: string | null
  company_id: string | null
  stage_id: string | null
  title: string
  value: number
  currency: string
  expected_close_date: string | null
  actual_close_date: string | null
  priority: "low" | "medium" | "high"
  status: "open" | "won" | "lost"
  loss_reason: string | null
  notes: string | null
  created_at: string
  updated_at: string
  contacts?: Contact
  companies?: Company
  pipeline_stages?: PipelineStage
}

export interface DealActivity {
  id: string
  deal_id: string
  type: "call" | "email" | "meeting" | "note" | "stage_change" | "task"
  title: string
  description: string | null
  activity_date: string
  performed_by: string
  created_at: string
}

// ---- CRM: Tasks ----

export interface FollowUpTask {
  id: string
  owner_id: string
  contact_id: string | null
  deal_id: string | null
  title: string
  description: string | null
  due_date: string | null
  priority: "low" | "medium" | "high"
  status: "pending" | "completed" | "overdue"
  assigned_to: string | null
  created_at: string
  updated_at: string
  contacts?: Contact
  deals?: Deal
}

// ---- Smart Alerts ----

export type AlertType = "inventory_low" | "payment_overdue" | "churn_risk" | "anomaly" | "insight"
export type AlertSeverity = "info" | "warning" | "critical"

export interface SmartAlert {
  id: string
  owner_id: string
  type: AlertType
  severity: AlertSeverity
  title: string
  message: string
  entity_type: string | null
  entity_id: string | null
  is_resolved: boolean
  resolved_at: string | null
  metadata: Record<string, any>
  created_at: string
}

// ---- Communication: Conversations & Messages ----

export interface Conversation {
  id: string
  owner_id: string
  contact_id: string
  subject: string | null
  last_message_at: string
  last_message_preview: string | null
  platform: "whatsapp" | "email" | "in_app"
  status: "active" | "archived"
  created_at: string
  updated_at: string
  contacts?: Contact
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string | null
  sender_type: "business" | "customer"
  content: string
  metadata: Record<string, any>
  is_read: boolean
  status: "sending" | "sent" | "delivered" | "read" | "failed"
  external_id: string | null
  error_message: string | null
  created_at: string
}

export interface MessageTemplate {
  id: string
  owner_id: string
  name: string
  content: string
  category: string | null
  created_at: string
  updated_at: string
}

// ---- Helpdesk: Tickets & Articles ----

export interface SupportTicket {
  id: string
  owner_id: string
  contact_id: string | null
  subject: string
  description: string | null
  priority: "low" | "medium" | "high" | "urgent"
  status: "open" | "pending" | "resolved" | "closed"
  assigned_to: string | null
  due_at: string | null
  tags: string[] | null
  created_at: string
  updated_at: string
  contacts?: Contact
}

export interface TicketComment {
  id: string
  ticket_id: string
  author_id: string | null
  content: string
  is_internal: boolean
  created_at: string
}

export interface KnowledgeArticle {
  id: string
  owner_id: string
  title: string
  content: string
  category: string | null
  is_published: boolean
  slug: string
  created_at: string
  updated_at: string
}

// ---- AI Intelligence: Insights & Forecasts ----

export interface AIInsight {
  id: string
  owner_id: string
  type: "anomaly" | "trend" | "recommendation" | "insight"
  severity: "info" | "warning" | "critical"
  category: "sales" | "inventory" | "finance" | "crm"
  title: string
  description: string
  impact_value: string | null
  action_url: string | null
  metadata: Record<string, any>
  is_read: boolean
  created_at: string
}

export interface PerformanceForecast {
  id: string
  owner_id: string
  target_date: string
  forecast_type: "revenue" | "sales_count" | "expense"
  predicted_value: number
  lower_bound: number | null
  upper_bound: number | null
  confidence_score: number
  model_version: string | null
  created_at: string
}

export interface DemandProjection {
  id: string
  owner_id: string
  product_id: string
  projected_out_of_stock_date: string | null
  recommended_restock_date: string | null
  recommended_quantity: number | null
  confidence_score: number
  created_at: string
}

export interface ChurnAnalysis {
  id: string
  owner_id: string
  contact_id: string
  risk_score: number
  risk_level: "low" | "medium" | "high"
  risk_factors: string[] | null
  last_analyzed_at: string
  created_at: string
}

export interface BusinessSnapshot {
  id: string
  owner_id: string
  snapshot_date: string
  metrics: Record<string, any>
  created_at: string
}

// ---- Multi-Store & B2B Wholesale ----

export interface BusinessLocation {
  id: string
  owner_id: string
  name: string
  type: "retail" | "warehouse" | "hybrid"
  address: string | null
  phone: string | null
  is_active: boolean
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export interface LocationInventory {
  id: string
  location_id: string
  product_id: string
  stock_quantity: number
  min_stock_level: number
  last_restock_date: string | null
}

export interface WholesaleTier {
  id: string
  owner_id: string
  name: string
  discount_percentage: number
  min_order_value: number
  created_at: string
}

export interface BulkOrder {
  id: string
  owner_id: string
  client_id: string
  location_id: string | null
  status: "draft" | "pending_approval" | "processing" | "shipped" | "delivered" | "cancelled"
  total_amount: number
  tax_amount: number
  discount_amount: number
  payment_status: "pending" | "partial" | "paid"
  notes: string | null
  expected_delivery_date: string | null
  created_at: string
  updated_at: string
}

export interface BulkOrderItem {
  id: string
  bulk_order_id: string
  product_id: string
  quantity: number
  unit_price: number
  total_price: number
}

export interface ClientPortal {
  id: string
  owner_id: string
  company_id: string
  subdomain: string
  is_active: boolean
  theme_config: Record<string, any>
  created_at: string
}

// ---- Phase 5: Premium & Global ----

export interface LoyaltyProgram {
  id: string
  owner_id: string
  name: string
  points_per_rupee: number
  min_redemption_points: number
  is_active: boolean
  created_at: string
}

export interface CustomerLoyalty {
  id: string
  contact_id: string
  points_balance: number
  total_earned: number
  total_spent: number
  last_updated_at: string
}

export interface SubscriptionPlan {
  id: string
  name: "Free" | "Pro" | "Enterprise"
  price_monthly: number
  features: Record<string, any>
  is_active: boolean
}

export interface ExchangeRate {
  id: string
  base_currency: string
  target_currency: string
  rate: number
  last_updated_at: string
}

// ---- Multi-Tenant Communications ----

export interface TenantCommsCredentials {
  id: string
  owner_id: string
  provider: "whatsapp" | "resend" | "smtp" | "sendgrid"
  credentials: string // Encrypted
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CommsSettings {
  id: string
  owner_id: string
  whatsapp_phone_number: string | null
  whatsapp_phone_id: string | null
  whatsapp_waba_id: string | null
  email_from_name: string | null
  email_from_address: string | null
  verified_domains: string[]
  webhook_secret: string
  created_at: string
  updated_at: string
}

export interface Customer {
  id: string
  owner_id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  gstin: string | null
  total_purchases: number
  total_paid: number
  outstanding_balance: number
  credit_limit: number
  advance_balance: number
  notes: string | null
  tags: string[] | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Manufacturer {
  id: string
  owner_id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  gstin: string | null
  total_purchased: number
  total_paid: number
  outstanding_balance: number
  advance_balance: number
  notes: string | null
  payment_terms: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PaymentTransaction {
  id: string
  owner_id: string
  created_by: string | null
  reference_type: 'sale' | 'purchase' | 'expense'
  reference_id: string
  amount: number
  payment_method: 'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'card' | 'advance' | 'other'
  payment_date: string
  notes: string | null
  cheque_number: string | null
  cheque_date: string | null
  cheque_bank: string | null
  cheque_cleared: boolean
  cheque_cleared_date: string | null
  transaction_ref: string | null
  created_at: string
}

export interface PurchaseOrder {
  id: string
  owner_id: string
  manufacturer_id: string | null
  location_id: string | null
  po_number: string | null
  status: 'draft' | 'sent' | 'confirmed' | 'received' | 'partial' | 'cancelled'
  subtotal: number
  gst_amount: number
  total_amount: number
  amount_paid: number
  balance_due: number
  expected_delivery_date: string | null
  received_date: string | null
  notes: string | null
  is_auto_generated: boolean
  created_at: string
  updated_at: string
  manufacturers?: Manufacturer
  purchase_order_items?: PurchaseOrderItem[]
}

export interface PurchaseOrderItem {
  id: string
  purchase_order_id: string
  product_id: string | null
  product_name: string
  quantity: number
  unit_price: number
  gst_percent: number
  line_total: number
  quantity_received: number
  created_at: string
}

export interface SalesTarget {
  id: string
  owner_id: string
  employee_id: string
  target_amount: number
  achieved_amount: number
  period_month: number
  period_year: number
  created_at: string
  updated_at: string
}





