-- =============================================================================
-- STARTUPSPHERE COMPLETE RESET + FULL FEATURE SETUP SCRIPT
-- =============================================================================
-- This script is intended to be run in the Supabase SQL Editor.
-- It drops the existing public schema and recreates the complete platform,
-- including core operations, CRM, communications, AI intelligence,
-- multi-store, B2B, loyalty, memberships, workflows, and permissions.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- 1. FULL RESET
-- =============================================================================
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;

-- =============================================================================
-- 3. CORE TABLES
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  company_name text,
  role text DEFAULT 'owner',
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status text DEFAULT 'active',
  is_super_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  currency text DEFAULT 'INR',
  base_currency text DEFAULT 'INR',
  currency_symbol text DEFAULT '₹',
  currency_rate numeric(20,8) DEFAULT 1.0,
  currency_updated_at timestamptz,
  language_pref text DEFAULT 'en',
  timezone text DEFAULT 'Asia/Kolkata',
  active_branch_id uuid,
  max_locations integer DEFAULT 3,
  max_employees integer DEFAULT 2,
  has_sales_pack boolean DEFAULT false,
  has_multi_tenancy_pack boolean DEFAULT false,
  has_core_modules_pack boolean DEFAULT true,
  has_ai_analysis_pack boolean DEFAULT false,
  has_crm_pack boolean DEFAULT false,
  can_manage_inventory boolean DEFAULT false,
  can_manage_sales boolean DEFAULT false,
  can_manage_accounting boolean DEFAULT false,
  address text,
  phone text,
  website text,
  description text,
  gstin text,
  branding_settings jsonb DEFAULT '{}'::jsonb,
  plan_id uuid
);

CREATE TABLE IF NOT EXISTS public.locations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  city text,
  address text,
  type text DEFAULT 'retail',
  phone text,
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  name text NOT NULL,
  sku text,
  description text,
  price numeric(12,2) DEFAULT 0,
  cost_price numeric(12,2) DEFAULT 0,
  stock_quantity integer DEFAULT 0,
  min_stock_level integer DEFAULT 10,
  category text,
  manufacturer_name text,
  manufacturer_address text,
  manufacturer_gstin text,
  purchase_gst_rate numeric(5,2) DEFAULT 0.00,
  receipt_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wholesale_tiers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  discount_percentage numeric(5,2) DEFAULT 0.00,
  min_order_value numeric(15,2) DEFAULT 0.00,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.location_inventory (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id uuid REFERENCES public.locations(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  stock_quantity integer DEFAULT 0,
  min_stock_level integer DEFAULT 5,
  last_restock_date timestamptz,
  UNIQUE(location_id, product_id)
);

CREATE TABLE IF NOT EXISTS public.companies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  industry text,
  website text,
  phone text,
  address text,
  size text,
  notes text,
  wholesale_tier_id uuid REFERENCES public.wholesale_tiers(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bulk_orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  status text DEFAULT 'draft',
  total_amount numeric(15,2) DEFAULT 0,
  tax_amount numeric(15,2) DEFAULT 0,
  discount_amount numeric(15,2) DEFAULT 0,
  payment_status text DEFAULT 'pending',
  notes text,
  expected_delivery_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bulk_order_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  bulk_order_id uuid REFERENCES public.bulk_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  quantity integer NOT NULL,
  unit_price numeric(15,2) NOT NULL,
  total_price numeric(15,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.client_portals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  subdomain text UNIQUE,
  is_active boolean DEFAULT true,
  theme_config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sales_orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name text,
  customer_phone text,
  customer_email text,
  notes text,
  total_amount numeric DEFAULT 0,
  gst_amount numeric DEFAULT 0,
  status text DEFAULT 'completed',
  order_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid REFERENCES public.sales_orders(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  quantity integer DEFAULT 1,
  unit_price numeric DEFAULT 0,
  line_total numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  category text,
  amount numeric DEFAULT 0,
  description text,
  expense_date date DEFAULT CURRENT_DATE,
  gst_applicable boolean DEFAULT false,
  gst_amount numeric DEFAULT 0,
  itc_eligible boolean DEFAULT false,
  tax_category text,
  receipt_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  order_id uuid REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  invoice_number text,
  customer_name text,
  customer_company text,
  customer_email text,
  customer_phone text,
  customer_gst_no text,
  issue_date date DEFAULT CURRENT_DATE,
  due_date date,
  status text DEFAULT 'pending',
  subtotal numeric DEFAULT 0,
  gst_rate numeric DEFAULT 0,
  gst_amount numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  first_name text,
  last_name text,
  email text,
  phone text,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  lead_status text DEFAULT 'new',
  lead_score numeric DEFAULT 0,
  lifecycle_stage text DEFAULT 'lead',
  wholesale_tier_id uuid REFERENCES public.wholesale_tiers(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pipeline_stages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  order_index integer DEFAULT 0,
  probability integer DEFAULT 0,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.deals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  stage_id uuid REFERENCES public.pipeline_stages(id) ON DELETE SET NULL,
  title text NOT NULL,
  value numeric DEFAULT 0,
  currency text DEFAULT 'INR',
  expected_close_date date,
  actual_close_date date,
  priority text DEFAULT 'medium',
  status text DEFAULT 'open',
  loss_reason text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.deal_activities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id uuid REFERENCES public.deals(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  description text,
  activity_date timestamptz DEFAULT now(),
  performed_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.follow_up_tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  due_date timestamptz,
  priority text DEFAULT 'medium',
  status text DEFAULT 'pending',
  assigned_to uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.smart_alerts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  severity text DEFAULT 'info',
  title text NOT NULL,
  message text NOT NULL,
  entity_type text,
  entity_id uuid,
  is_resolved boolean DEFAULT false,
  resolved_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.employee_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_email text,
  employee_email text NOT NULL,
  employee_password_hash text NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.employee_permissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  branch_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  can_access_sales boolean DEFAULT true,
  can_access_inventory boolean DEFAULT true,
  can_access_accounting boolean DEFAULT false,
  can_access_crm boolean DEFAULT false,
  can_access_employees boolean DEFAULT false,
  can_access_reports boolean DEFAULT false,
  can_access_ai_features boolean DEFAULT false,
  can_access_settings boolean DEFAULT false,
  can_create boolean DEFAULT true,
  can_edit boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.employee_branch_assignments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  branch_id uuid REFERENCES public.locations(id) ON DELETE CASCADE NOT NULL,
  can_view_sales boolean DEFAULT true,
  can_create_sales boolean DEFAULT true,
  can_delete_sales boolean DEFAULT false,
  can_view_inventory boolean DEFAULT true,
  can_edit_inventory boolean DEFAULT false,
  can_delete_inventory boolean DEFAULT false,
  can_view_customers boolean DEFAULT true,
  can_edit_customers boolean DEFAULT false,
  can_view_expenses boolean DEFAULT false,
  can_view_reports boolean DEFAULT false,
  can_view_employees boolean DEFAULT false,
  is_branch_manager boolean DEFAULT false,
  is_active boolean DEFAULT true,
  assigned_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, branch_id)
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type text,
  entity_type text,
  entity_id text,
  message text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  subject text,
  last_message_at timestamptz DEFAULT now(),
  last_message_preview text,
  platform text DEFAULT 'in_app',
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_type text DEFAULT 'business',
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false,
  status text DEFAULT 'sent',
  error_message text,
  external_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.message_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  content text NOT NULL,
  category text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  subject text NOT NULL,
  description text,
  priority text DEFAULT 'medium',
  status text DEFAULT 'open',
  assigned_to uuid REFERENCES auth.users(id),
  due_at timestamptz,
  tags text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ticket_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id uuid REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id),
  content text NOT NULL,
  is_internal boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.knowledge_articles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  category text,
  is_published boolean DEFAULT false,
  slug text UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workflows (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  trigger_type text NOT NULL,
  trigger_config jsonb DEFAULT '{}'::jsonb,
  steps jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workflow_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id uuid REFERENCES public.workflows(id) ON DELETE CASCADE,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL,
  execution_details jsonb DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.membership_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  requested_packs text[] DEFAULT '{}'::text[],
  status text DEFAULT 'pending',
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.approved_owners (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  approved_at timestamptz DEFAULT now(),
  notes text
);

CREATE TABLE IF NOT EXISTS public.owner_leads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text UNIQUE NOT NULL,
  phone text NOT NULL,
  business_name text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_insights (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  severity text DEFAULT 'info',
  category text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  impact_value text,
  action_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.performance_forecasts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  target_date date NOT NULL,
  forecast_type text NOT NULL,
  predicted_value numeric(15,2) NOT NULL,
  lower_bound numeric(15,2),
  upper_bound numeric(15,2),
  confidence_score integer,
  model_version text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.demand_projections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  projected_out_of_stock_date date,
  recommended_restock_date date,
  recommended_quantity integer,
  confidence_score integer,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.churn_analysis (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  risk_score integer NOT NULL,
  risk_level text,
  risk_factors text[],
  last_analyzed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.business_snapshots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_date date DEFAULT CURRENT_DATE,
  metrics jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.loyalty_programs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  points_per_rupee numeric(5,2) DEFAULT 1.00,
  min_redemption_points integer DEFAULT 100,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.customer_loyalty (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  points_balance integer DEFAULT 0,
  total_earned integer DEFAULT 0,
  total_spent integer DEFAULT 0,
  last_updated_at timestamptz DEFAULT now(),
  UNIQUE(contact_id)
);

CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  type text NOT NULL,
  amount integer NOT NULL,
  order_id uuid REFERENCES public.sales_orders(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  price_monthly numeric(15,2) NOT NULL,
  features jsonb NOT NULL,
  is_active boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  base_currency varchar(3) NOT NULL DEFAULT 'INR',
  target_currency varchar(3) NOT NULL,
  rate numeric(20,8) NOT NULL,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(base_currency, target_currency)
);

CREATE TABLE IF NOT EXISTS public.tenant_comms_credentials (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  credentials text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(owner_id, provider)
);

CREATE TABLE IF NOT EXISTS public.comms_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  whatsapp_phone_number text,
  whatsapp_phone_id text,
  whatsapp_waba_id text,
  email_from_name text,
  email_from_address text,
  verified_domains text[] DEFAULT '{}'::text[],
  webhook_secret text DEFAULT gen_random_uuid()::text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.customer_feedback (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  comment text,
  source text,
  sentiment text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.memberships (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_name text,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.subscription_plans(id),
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.automation_sequences (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  steps jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.leads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  status text DEFAULT 'new',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.automation_jobs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  job_type text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_configs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
-- =============================================================================
-- 2. HELPER FUNCTIONS
-- =============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, status)
  VALUES (NEW.id, NEW.email, 'owner', 'active')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_owner_by_email(p_email text)
RETURNS uuid AS $$
  SELECT au.id
  FROM auth.users au
  INNER JOIN public.profiles p ON p.id = au.id
  WHERE LOWER(au.email) = LOWER(p_email)
    AND p.role = 'owner'
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.check_owner_email_exists(p_email text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE email = p_email AND role = 'owner'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.check_is_super_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_super_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.increment_stock(p_product_id uuid, p_amount integer)
RETURNS void AS $$
BEGIN
  UPDATE public.products
  SET stock_quantity = GREATEST(0, stock_quantity + p_amount), updated_at = NOW()
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.sync_inventory_on_order_status_change()
RETURNS trigger AS $$
BEGIN
  IF OLD.status = 'completed' AND NEW.status IN ('cancelled', 'refunded') THEN
    UPDATE public.products p
    SET stock_quantity = p.stock_quantity + oi.quantity
    FROM public.order_items oi
    WHERE oi.order_id = NEW.id AND p.id = oi.product_id;
  END IF;

  IF OLD.status IN ('cancelled', 'refunded') AND NEW.status = 'completed' THEN
    UPDATE public.products p
    SET stock_quantity = p.stock_quantity - oi.quantity
    FROM public.order_items oi
    WHERE oi.order_id = NEW.id AND p.id = oi.product_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.sync_inventory_on_order_update()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.status IN ('cancelled', 'refunded') AND OLD.status NOT IN ('cancelled', 'refunded') THEN
      UPDATE public.products p
      SET stock_quantity = p.stock_quantity + oi.quantity
      FROM public.order_items oi
      WHERE oi.order_id = NEW.id AND oi.product_id = p.id;
    END IF;

    IF OLD.status IN ('cancelled', 'refunded') AND NEW.status NOT IN ('cancelled', 'refunded') THEN
      UPDATE public.products p
      SET stock_quantity = p.stock_quantity - oi.quantity
      FROM public.order_items oi
      WHERE oi.order_id = NEW.id AND oi.product_id = p.id;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.status NOT IN ('cancelled', 'refunded') THEN
      UPDATE public.products p
      SET stock_quantity = p.stock_quantity + oi.quantity
      FROM public.order_items oi
      WHERE oi.order_id = OLD.id AND oi.product_id = p.id;
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.user_has_store_access(p_store_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.locations
    WHERE id = p_store_id AND owner_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_store_owner(p_store_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.locations
    WHERE id = p_store_id AND owner_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.check_owner_email_exists(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_stock(uuid, integer) TO anon, authenticated, service_role;



-- =============================================================================
-- 4. TABLE-LEVEL RLS ENABLEMENT
-- =============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_branch_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approved_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demand_projections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.churn_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wholesale_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_portals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_loyalty ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_comms_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comms_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_configs ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 5. RLS POLICIES
-- =============================================================================
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT USING (auth.uid() = id OR auth.uid() = owner_id OR auth.uid() IN (SELECT id FROM public.profiles WHERE owner_id = profiles.owner_id) OR public.check_is_super_admin());

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE USING (auth.uid() = id OR auth.uid() = owner_id OR public.check_is_super_admin());

DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS profiles_public_read_owners ON public.profiles;
CREATE POLICY profiles_public_read_owners ON public.profiles
  FOR SELECT USING (role = 'owner');

DROP POLICY IF EXISTS locations_select_own ON public.locations;
CREATE POLICY locations_select_own ON public.locations
  FOR SELECT USING (auth.uid() = owner_id OR auth.uid() IN (SELECT employee_id FROM public.employee_branch_assignments WHERE branch_id = locations.id AND is_active = true) OR public.check_is_super_admin());

DROP POLICY IF EXISTS locations_manage_own ON public.locations;
CREATE POLICY locations_manage_own ON public.locations
  FOR ALL USING (auth.uid() = owner_id OR public.check_is_super_admin());

DROP POLICY IF EXISTS products_select_own ON public.products;
CREATE POLICY products_select_own ON public.products
  FOR SELECT USING (auth.uid() = owner_id OR auth.uid() IN (SELECT employee_id FROM public.employee_branch_assignments WHERE branch_id = products.location_id AND is_active = true) OR public.check_is_super_admin() OR true);

DROP POLICY IF EXISTS products_manage_own ON public.products;
CREATE POLICY products_manage_own ON public.products
  FOR ALL USING (auth.uid() = owner_id OR public.check_is_super_admin());

DROP POLICY IF EXISTS sales_select_own ON public.sales_orders;
CREATE POLICY sales_select_own ON public.sales_orders
  FOR SELECT USING (auth.uid() = owner_id OR auth.uid() IN (SELECT employee_id FROM public.employee_branch_assignments WHERE branch_id = sales_orders.location_id AND is_active = true) OR public.check_is_super_admin());

DROP POLICY IF EXISTS sales_manage_own ON public.sales_orders;
CREATE POLICY sales_manage_own ON public.sales_orders
  FOR ALL USING (auth.uid() = owner_id OR public.check_is_super_admin());

DROP POLICY IF EXISTS public_receipt_sales ON public.sales_orders;
CREATE POLICY public_receipt_sales ON public.sales_orders
  FOR SELECT USING (true);

DROP POLICY IF EXISTS public_receipt_order_items ON public.order_items;
CREATE POLICY public_receipt_order_items ON public.order_items
  FOR SELECT USING (true);

DROP POLICY IF EXISTS public_receipt_products ON public.products;
CREATE POLICY public_receipt_products ON public.products
  FOR SELECT USING (true);

DROP POLICY IF EXISTS expenses_access ON public.expenses;
CREATE POLICY expenses_access ON public.expenses
  FOR ALL USING (owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND profiles.owner_id = expenses.owner_id) OR public.check_is_super_admin());

DROP POLICY IF EXISTS invoices_access ON public.invoices;
CREATE POLICY invoices_access ON public.invoices
  FOR ALL USING (owner_id = auth.uid() OR public.check_is_super_admin());

DROP POLICY IF EXISTS contacts_access ON public.contacts;
CREATE POLICY contacts_access ON public.contacts
  FOR ALL USING (owner_id = auth.uid() OR public.check_is_super_admin());

DROP POLICY IF EXISTS companies_access ON public.companies;
CREATE POLICY companies_access ON public.companies
  FOR ALL USING (owner_id = auth.uid() OR public.check_is_super_admin());

DROP POLICY IF EXISTS deals_access ON public.deals;
CREATE POLICY deals_access ON public.deals
  FOR ALL USING (owner_id = auth.uid() OR public.check_is_super_admin());

DROP POLICY IF EXISTS pipeline_access ON public.pipeline_stages;
CREATE POLICY pipeline_access ON public.pipeline_stages
  FOR ALL USING (owner_id IS NULL OR owner_id = auth.uid() OR public.check_is_super_admin());

DROP POLICY IF EXISTS employee_requests_insert ON public.employee_requests;
CREATE POLICY employee_requests_insert ON public.employee_requests
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS employee_requests_select_own ON public.employee_requests;
CREATE POLICY employee_requests_select_own ON public.employee_requests
  FOR SELECT USING (auth.uid() = owner_id OR auth.uid() IN (SELECT id FROM public.profiles WHERE owner_id = employee_requests.owner_id) OR public.check_is_super_admin());

DROP POLICY IF EXISTS owner_manages_permissions ON public.employee_permissions;
CREATE POLICY owner_manages_permissions ON public.employee_permissions
  FOR ALL USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS employee_reads_own ON public.employee_permissions;
CREATE POLICY employee_reads_own ON public.employee_permissions
  FOR SELECT USING (auth.uid() = employee_id);

DROP POLICY IF EXISTS assignments_owner_manage ON public.employee_branch_assignments;
CREATE POLICY assignments_owner_manage ON public.employee_branch_assignments
  FOR ALL USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS assignments_employee_read ON public.employee_branch_assignments;
CREATE POLICY assignments_employee_read ON public.employee_branch_assignments
  FOR SELECT USING (auth.uid() = employee_id);

DROP POLICY IF EXISTS conversations_access ON public.conversations;
CREATE POLICY conversations_access ON public.conversations
  FOR ALL USING (owner_id = auth.uid() OR public.check_is_super_admin());

DROP POLICY IF EXISTS messages_access ON public.messages;
CREATE POLICY messages_access ON public.messages
  FOR ALL USING (sender_id = auth.uid() OR EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = messages.conversation_id AND c.owner_id = auth.uid()) OR public.check_is_super_admin());

DROP POLICY IF EXISTS templates_access ON public.message_templates;
CREATE POLICY templates_access ON public.message_templates
  FOR ALL USING (owner_id = auth.uid() OR public.check_is_super_admin());

DROP POLICY IF EXISTS tickets_access ON public.support_tickets;
CREATE POLICY tickets_access ON public.support_tickets
  FOR ALL USING (owner_id = auth.uid() OR public.check_is_super_admin());

DROP POLICY IF EXISTS ticket_comments_access ON public.ticket_comments;
CREATE POLICY ticket_comments_access ON public.ticket_comments
  FOR ALL USING (EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_comments.ticket_id AND (t.owner_id = auth.uid() OR public.check_is_super_admin())));

DROP POLICY IF EXISTS knowledge_access ON public.knowledge_articles;
CREATE POLICY knowledge_access ON public.knowledge_articles
  FOR ALL USING (owner_id = auth.uid() OR public.check_is_super_admin());

DROP POLICY IF EXISTS workflows_access ON public.workflows;
CREATE POLICY workflows_access ON public.workflows
  FOR ALL USING (owner_id = auth.uid() OR public.check_is_super_admin());

DROP POLICY IF EXISTS workflow_logs_access ON public.workflow_logs;
CREATE POLICY workflow_logs_access ON public.workflow_logs
  FOR ALL USING (owner_id = auth.uid() OR public.check_is_super_admin());

DROP POLICY IF EXISTS membership_requests_access ON public.membership_requests;
CREATE POLICY membership_requests_access ON public.membership_requests
  FOR ALL USING (auth.uid() = owner_id OR public.check_is_super_admin());

DROP POLICY IF EXISTS approved_owners_access ON public.approved_owners;
CREATE POLICY approved_owners_access ON public.approved_owners
  FOR ALL USING (public.check_is_super_admin());

DROP POLICY IF EXISTS owner_leads_insert ON public.owner_leads;
CREATE POLICY owner_leads_insert ON public.owner_leads
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS owner_leads_admin ON public.owner_leads;
CREATE POLICY owner_leads_admin ON public.owner_leads
  FOR SELECT USING (public.check_is_super_admin());

DROP POLICY IF EXISTS ai_insights_access ON public.ai_insights;
CREATE POLICY ai_insights_access ON public.ai_insights
  FOR ALL USING (owner_id = auth.uid() OR public.check_is_super_admin());

DROP POLICY IF EXISTS forecasts_access ON public.performance_forecasts;
CREATE POLICY forecasts_access ON public.performance_forecasts
  FOR ALL USING (owner_id = auth.uid() OR public.check_is_super_admin());

DROP POLICY IF EXISTS projections_access ON public.demand_projections;
CREATE POLICY projections_access ON public.demand_projections
  FOR ALL USING (owner_id = auth.uid() OR public.check_is_super_admin());

DROP POLICY IF EXISTS churn_access ON public.churn_analysis;
CREATE POLICY churn_access ON public.churn_analysis
  FOR ALL USING (owner_id = auth.uid() OR public.check_is_super_admin());

DROP POLICY IF EXISTS snapshots_access ON public.business_snapshots;
CREATE POLICY snapshots_access ON public.business_snapshots
  FOR ALL USING (owner_id = auth.uid() OR public.check_is_super_admin());

DROP POLICY IF EXISTS location_inventory_access ON public.location_inventory;
CREATE POLICY location_inventory_access ON public.location_inventory
  FOR ALL USING (EXISTS (SELECT 1 FROM public.locations l WHERE l.id = location_inventory.location_id AND (l.owner_id = auth.uid() OR public.check_is_super_admin())));

DROP POLICY IF EXISTS wholesale_tiers_access ON public.wholesale_tiers;
CREATE POLICY wholesale_tiers_access ON public.wholesale_tiers
  FOR ALL USING (owner_id = auth.uid() OR public.check_is_super_admin());

DROP POLICY IF EXISTS bulk_orders_access ON public.bulk_orders;
CREATE POLICY bulk_orders_access ON public.bulk_orders
  FOR ALL USING (owner_id = auth.uid() OR public.check_is_super_admin());

DROP POLICY IF EXISTS bulk_order_items_access ON public.bulk_order_items;
CREATE POLICY bulk_order_items_access ON public.bulk_order_items
  FOR ALL USING (EXISTS (SELECT 1 FROM public.bulk_orders bo WHERE bo.id = bulk_order_items.bulk_order_id AND (bo.owner_id = auth.uid() OR public.check_is_super_admin())));

DROP POLICY IF EXISTS client_portals_access ON public.client_portals;
CREATE POLICY client_portals_access ON public.client_portals
  FOR ALL USING (owner_id = auth.uid() OR public.check_is_super_admin());

DROP POLICY IF EXISTS loyalty_programs_access ON public.loyalty_programs;
CREATE POLICY loyalty_programs_access ON public.loyalty_programs
  FOR ALL USING (owner_id = auth.uid() OR public.check_is_super_admin());

DROP POLICY IF EXISTS customer_loyalty_access ON public.customer_loyalty;
CREATE POLICY customer_loyalty_access ON public.customer_loyalty
  FOR ALL USING (EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = customer_loyalty.contact_id AND (c.owner_id = auth.uid() OR public.check_is_super_admin())));

DROP POLICY IF EXISTS loyalty_transactions_access ON public.loyalty_transactions;
CREATE POLICY loyalty_transactions_access ON public.loyalty_transactions
  FOR ALL USING (EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = loyalty_transactions.contact_id AND (c.owner_id = auth.uid() OR public.check_is_super_admin())));

DROP POLICY IF EXISTS subscription_plans_read ON public.subscription_plans;
CREATE POLICY subscription_plans_read ON public.subscription_plans
  FOR SELECT USING (true);

DROP POLICY IF EXISTS subscription_plans_admin ON public.subscription_plans;
CREATE POLICY subscription_plans_admin ON public.subscription_plans
  FOR ALL USING (public.check_is_super_admin());

DROP POLICY IF EXISTS exchange_rates_read ON public.exchange_rates;
CREATE POLICY exchange_rates_read ON public.exchange_rates
  FOR SELECT USING (true);

DROP POLICY IF EXISTS credentials_access ON public.tenant_comms_credentials;
CREATE POLICY credentials_access ON public.tenant_comms_credentials
  FOR ALL USING (owner_id = auth.uid());

DROP POLICY IF EXISTS comms_settings_access ON public.comms_settings;
CREATE POLICY comms_settings_access ON public.comms_settings
  FOR ALL USING (owner_id = auth.uid() OR public.check_is_super_admin());

DROP POLICY IF EXISTS feedback_access ON public.customer_feedback;
CREATE POLICY feedback_access ON public.customer_feedback
  FOR ALL USING (owner_id = auth.uid() OR public.check_is_super_admin());

DROP POLICY IF EXISTS memberships_access ON public.memberships;
CREATE POLICY memberships_access ON public.memberships
  FOR ALL USING (owner_id = auth.uid() OR public.check_is_super_admin());

DROP POLICY IF EXISTS subscriptions_access ON public.user_subscriptions;
CREATE POLICY subscriptions_access ON public.user_subscriptions
  FOR ALL USING (user_id = auth.uid() OR public.check_is_super_admin());

DROP POLICY IF EXISTS automation_sequences_access ON public.automation_sequences;
CREATE POLICY automation_sequences_access ON public.automation_sequences
  FOR ALL USING (owner_id = auth.uid() OR public.check_is_super_admin());

DROP POLICY IF EXISTS leads_access ON public.leads;
CREATE POLICY leads_access ON public.leads
  FOR ALL USING (owner_id = auth.uid() OR public.check_is_super_admin());

DROP POLICY IF EXISTS automation_jobs_access ON public.automation_jobs;
CREATE POLICY automation_jobs_access ON public.automation_jobs
  FOR ALL USING (owner_id = auth.uid() OR public.check_is_super_admin());

DROP POLICY IF EXISTS user_configs_access ON public.user_configs;
CREATE POLICY user_configs_access ON public.user_configs
  FOR ALL USING (user_id = auth.uid() OR public.check_is_super_admin());

-- =============================================================================
-- 6. TRIGGERS, STORAGE, AND DEFAULT DATA
-- =============================================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER update_workflows_updated_at
BEFORE UPDATE ON public.workflows
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS on_sales_order_status_change ON public.sales_orders;
CREATE TRIGGER on_sales_order_status_change
AFTER UPDATE ON public.sales_orders
FOR EACH ROW EXECUTE FUNCTION public.sync_inventory_on_order_status_change();

DROP TRIGGER IF EXISTS trg_sync_inventory ON public.sales_orders;
CREATE TRIGGER trg_sync_inventory
AFTER UPDATE OR DELETE ON public.sales_orders
FOR EACH ROW EXECUTE FUNCTION public.sync_inventory_on_order_update();

INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.subscription_plans (id, name, price_monthly, features) VALUES
  (gen_random_uuid(), 'Free', 0, '{"ai_insights": false, "multi_store": false, "helpdesk": false, "loyalty": false}'::jsonb),
  (gen_random_uuid(), 'Pro', 999, '{"ai_insights": true, "multi_store": true, "helpdesk": true, "loyalty": true, "max_stores": 3}'::jsonb),
  (gen_random_uuid(), 'Enterprise', 4999, '{"ai_insights": true, "multi_store": true, "helpdesk": true, "loyalty": true, "max_stores": 100, "white_label": true}'::jsonb)
ON CONFLICT DO NOTHING;

INSERT INTO public.pipeline_stages (id, owner_id, name, order_index, probability, is_default)
VALUES
  (gen_random_uuid(), NULL, 'New Lead', 0, 10, true),
  (gen_random_uuid(), NULL, 'Qualified', 1, 20, true),
  (gen_random_uuid(), NULL, 'Proposal', 2, 40, true),
  (gen_random_uuid(), NULL, 'Won', 3, 100, true)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 7. INDEXES AND REALTIME ENABLEMENT
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_products_owner_id ON public.products(owner_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_owner_id ON public.sales_orders(owner_id);
CREATE INDEX IF NOT EXISTS idx_expenses_owner_id ON public.expenses(owner_id);
CREATE INDEX IF NOT EXISTS idx_contacts_owner_id ON public.contacts(owner_id);
CREATE INDEX IF NOT EXISTS idx_deals_owner_id ON public.deals(owner_id);
CREATE INDEX IF NOT EXISTS idx_employee_requests_owner_id ON public.employee_requests(owner_id);
CREATE INDEX IF NOT EXISTS idx_employee_permissions_owner_id ON public.employee_permissions(owner_id);
CREATE INDEX IF NOT EXISTS idx_employee_permissions_employee_id ON public.employee_permissions(employee_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_owner ON public.notifications(owner_id, user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_owner_id ON public.conversations(owner_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_owner_id ON public.support_tickets(owner_id);
CREATE INDEX IF NOT EXISTS idx_workflows_owner_id ON public.workflows(owner_id);
CREATE INDEX IF NOT EXISTS idx_membership_requests_owner_id ON public.membership_requests(owner_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_owner_id ON public.ai_insights(owner_id);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_owner_id ON public.customer_feedback(owner_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profiles') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'conversations') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'support_tickets') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'ai_insights') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_insights;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'comms_settings') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.comms_settings;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'membership_requests') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.membership_requests;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'sales_orders') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.sales_orders;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'invoices') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'expenses') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
    END IF;
  END IF;
END $$;
