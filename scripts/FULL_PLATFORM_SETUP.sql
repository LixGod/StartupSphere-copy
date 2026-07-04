-- =============================================================================
-- STARTUPSPHERE ULTIMATE CONSOLIDATED SETUP SCRIPT
-- =============================================================================
-- This script sets up the entire StartupSphere ecosystem from scratch.
-- Includes: Auth, Profiles, Inventory, Sales, Accounting, CRM, Communications,
-- AI Intelligence, Multi-store, B2B, and Memberships.
-- =============================================================================

-- 0. CLEANUP (Optional: Uncomment to wipe entire database before setup)

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.check_is_super_admin() CASCADE;

DROP TABLE IF EXISTS public.workflow_logs CASCADE;
DROP TABLE IF EXISTS public.workflows CASCADE;
DROP TABLE IF EXISTS public.automation_jobs CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.leads CASCADE;
DROP TABLE IF EXISTS public.user_configs CASCADE;
DROP TABLE IF EXISTS public.pipeline_stages CASCADE;
DROP TABLE IF EXISTS public.automation_sequences CASCADE;
DROP TABLE IF EXISTS public.membership_requests CASCADE;
DROP TABLE IF EXISTS public.user_subscriptions CASCADE;
DROP TABLE IF EXISTS public.memberships CASCADE;
DROP TABLE IF EXISTS public.subscription_plans CASCADE;
DROP TABLE IF EXISTS public.loyalty_transactions CASCADE;
DROP TABLE IF EXISTS public.customer_loyalty CASCADE;
DROP TABLE IF EXISTS public.loyalty_programs CASCADE;
DROP TABLE IF EXISTS public.bulk_order_items CASCADE;
DROP TABLE IF EXISTS public.bulk_orders CASCADE;
DROP TABLE IF EXISTS public.wholesale_tiers CASCADE;
DROP TABLE IF EXISTS public.location_inventory CASCADE;
DROP TABLE IF EXISTS public.locations CASCADE;
DROP TABLE IF EXISTS public.churn_analysis CASCADE;
DROP TABLE IF EXISTS public.performance_forecasts CASCADE;
DROP TABLE IF EXISTS public.ai_insights CASCADE;
DROP TABLE IF EXISTS public.smart_alerts CASCADE;
DROP TABLE IF EXISTS public.comms_settings CASCADE;
DROP TABLE IF EXISTS public.bulk_orders CASCADE;
DROP TABLE IF EXISTS public.client_portals CASCADE;
DROP TABLE IF EXISTS public.wholesale_tiers CASCADE;
DROP TABLE IF EXISTS public.location_inventory CASCADE;
DROP TABLE IF EXISTS public.locations CASCADE;
DROP TABLE IF EXISTS public.ai_insights CASCADE;
DROP TABLE IF EXISTS public.performance_forecasts CASCADE;
DROP TABLE IF EXISTS public.demand_projections CASCADE;
DROP TABLE IF EXISTS public.churn_analysis CASCADE;
DROP TABLE IF EXISTS public.business_snapshots CASCADE;
DROP TABLE IF EXISTS public.knowledge_articles CASCADE;
DROP TABLE IF EXISTS public.ticket_comments CASCADE;
DROP TABLE IF EXISTS public.support_tickets CASCADE;
DROP TABLE IF EXISTS public.message_templates CASCADE;
DROP TABLE IF EXISTS public.tenant_comms_credentials CASCADE;
DROP TABLE IF EXISTS public.comms_settings CASCADE;
DROP TABLE IF EXISTS public.ai_marketing_requests CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.employee_requests CASCADE;
DROP TABLE IF EXISTS public.owner_leads CASCADE;
DROP TABLE IF EXISTS public.approved_owners CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.expenses CASCADE;
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.sales_orders CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

DROP PUBLICATION IF EXISTS supabase_realtime;


-- ============================================
-- 1. EXTENSIONS & UTILITIES
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Function to update 'updated_at' column automatically
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- 2. CORE IDENTITY & TEAM
-- ============================================

-- PROFILES: Core user data
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('owner', 'employee')),
    email TEXT,
    gstin TEXT,
    address TEXT,
    phone TEXT,
    website TEXT,
    description TEXT,
    owner_id UUID REFERENCES auth.users(id),
    is_super_admin BOOLEAN DEFAULT FALSE,
    can_manage_inventory BOOLEAN DEFAULT FALSE,
    can_manage_sales BOOLEAN DEFAULT FALSE,
    can_manage_accounting BOOLEAN DEFAULT FALSE,
    -- Quotas & Packs
    has_sales_pack BOOLEAN DEFAULT TRUE,
    has_multi_tenancy_pack BOOLEAN DEFAULT FALSE,
    has_core_modules_pack BOOLEAN DEFAULT TRUE,
    has_ai_analysis_pack BOOLEAN DEFAULT FALSE,
    has_crm_pack BOOLEAN DEFAULT FALSE,
    max_employees INTEGER DEFAULT 2,
    max_locations INTEGER DEFAULT 1,
    base_currency TEXT DEFAULT 'INR',
    language_pref TEXT DEFAULT 'en',
    timezone TEXT DEFAULT 'Asia/Kolkata',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- EMPLOYEE_REQUESTS: Team invitations
CREATE TABLE IF NOT EXISTS public.employee_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_email TEXT NOT NULL,
    employee_email TEXT NOT NULL,
    employee_password_hash TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. INVENTORY & SALES
-- ============================================

-- PRODUCTS
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sku TEXT NOT NULL,
    description TEXT,
    price DECIMAL(12, 2) NOT NULL,
    cost_price DECIMAL(12, 2),
    stock_quantity INT DEFAULT 0,
    min_stock_level INT DEFAULT 10,
    category TEXT,
    manufacturer_name TEXT,
    manufacturer_address TEXT,
    manufacturer_gstin TEXT,
    purchase_gst_rate NUMERIC(5, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(owner_id, sku)
);

-- SALES_ORDERS
CREATE TABLE IF NOT EXISTS public.sales_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    location_id UUID,
    order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_amount DECIMAL(12, 2) NOT NULL,
    gst_amount DECIMAL(12, 2) DEFAULT 0,
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled', 'refunded')),
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ORDER_ITEMS
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    quantity INT NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    line_total DECIMAL(12, 2) NOT NULL
);

-- ============================================
-- 4. ACCOUNTING & BILLING
-- ============================================

-- EXPENSES
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    location_id UUID,
    category TEXT NOT NULL,
    description TEXT,
    amount DECIMAL(12, 2) NOT NULL,
    expense_date DATE NOT NULL,
    receipt_url TEXT,
    gst_applicable BOOLEAN DEFAULT FALSE,
    gst_amount DECIMAL(12, 2) DEFAULT 0,
    itc_eligible BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INVOICES
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    order_id UUID REFERENCES public.sales_orders(id) ON DELETE CASCADE,
    location_id UUID,
    customer_name TEXT NOT NULL,
    customer_company TEXT,
    customer_gst_no TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    issue_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    subtotal DECIMAL(12, 2) NOT NULL,
    gst_rate DECIMAL(5, 2) DEFAULT 18.00,
    gst_amount DECIMAL(12, 2) NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'paid', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(owner_id, invoice_number)
);

-- ============================================
-- 5. CRM & COMMUNICATION
-- ============================================

-- COMPANIES
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    industry TEXT,
    website TEXT,
    phone TEXT,
    address TEXT,
    size TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CONTACTS
CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    job_title TEXT,
    lead_source TEXT,
    lead_status TEXT DEFAULT 'new',
    lead_score INTEGER DEFAULT 0,
    tags TEXT[],
    lifecycle_stage TEXT DEFAULT 'lead',
    last_contact_date TIMESTAMPTZ,
    notes TEXT,
    linkedin_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PIPELINE STAGES
CREATE TABLE IF NOT EXISTS public.pipeline_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    probability INTEGER DEFAULT 0,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- DEALS
CREATE TABLE IF NOT EXISTS public.deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    stage_id UUID REFERENCES public.pipeline_stages(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    value NUMERIC(15, 2) DEFAULT 0.00,
    currency TEXT DEFAULT 'INR',
    expected_close_date DATE,
    actual_close_date DATE,
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'open',
    loss_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. CRM AUTOMATION (SEQUENCER)
-- ============================================

-- AUTOMATION_SEQUENCES
CREATE TABLE IF NOT EXISTS public.automation_sequences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    starter_message TEXT,
    followup_message TEXT,
    followup_delay_hours INTEGER DEFAULT 24,
    positive_reply_message TEXT,
    negative_reply_message TEXT,
    channels TEXT[] DEFAULT ARRAY['email'],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(owner_id, name)
);

-- LEADS (Automated Outreach)
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    stage_id UUID REFERENCES public.pipeline_stages(id) ON DELETE SET NULL,
    source_channel TEXT DEFAULT 'manual',
    last_contacted_at TIMESTAMPTZ,
    linkedin_url TEXT,
    active_sequence_id UUID REFERENCES public.automation_sequences(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    context JSONB DEFAULT '{}'::jsonb
);

-- AUTOMATION_JOBS (Queue)
CREATE TABLE IF NOT EXISTS public.automation_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'failed')),
    job_type TEXT NOT NULL,
    scheduled_for TIMESTAMPTZ NOT NULL,
    executed_at TIMESTAMPTZ,
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    locked_until TIMESTAMPTZ
);

-- USER_CONFIGS (API Keys)
CREATE TABLE IF NOT EXISTS public.user_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    resend_key_encrypted TEXT,
    whatsapp_token_encrypted TEXT,
    whatsapp_phone_number_id TEXT,
    groq_key_encrypted TEXT,
    linkedin_token_encrypted TEXT,
    from_email TEXT DEFAULT 'onboarding@resend.dev',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. COMMUNICATIONS (CHAT & INBOX)
-- ============================================

-- CONVERSATIONS
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
    subject TEXT,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_preview TEXT,
    platform TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- MESSAGES (Unified for CRM & Chat)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.profiles(id),
    sender_type TEXT NOT NULL, -- 'user', 'lead', 'system'
    direction TEXT DEFAULT 'outbound', -- 'outbound', 'inbound'
    channel TEXT DEFAULT 'email', -- 'email', 'whatsapp', 'linkedin', 'chat'
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'sent',
    error_message TEXT,
    external_id TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. SMART ALERTS & NOTIFICATIONS
-- ============================================

-- NOTIFICATIONS: System activity
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SMART_ALERTS: AI-driven proactive alerts
CREATE TABLE IF NOT EXISTS public.smart_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- inventory_low, payment_overdue, churn_risk, anomaly, insight
    severity TEXT DEFAULT 'info', -- info, warning, critical
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    entity_type TEXT, -- product, invoice, contact, etc.
    entity_id UUID,
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 8. AI INTELLIGENCE SUITE
-- ============================================

-- AI_INSIGHTS
CREATE TABLE IF NOT EXISTS public.ai_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL, 
    severity TEXT DEFAULT 'info',
    category TEXT NOT NULL, 
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    impact_value TEXT,
    action_url TEXT,
    metadata JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PERFORMANCE_FORECASTS
CREATE TABLE IF NOT EXISTS public.performance_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_date DATE NOT NULL,
    forecast_type TEXT NOT NULL, 
    predicted_value NUMERIC(15, 2) NOT NULL,
    lower_bound NUMERIC(15, 2),
    upper_bound NUMERIC(15, 2),
    confidence_score INTEGER,
    model_version TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CHURN_ANALYSIS
CREATE TABLE IF NOT EXISTS public.churn_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
    risk_score INTEGER NOT NULL,
    risk_level TEXT,
    risk_factors TEXT[],
    last_analyzed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. WORKFLOWS & AUTOMATION
-- ============================================

-- WORKFLOWS
CREATE TABLE IF NOT EXISTS public.workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    trigger_type TEXT NOT NULL,
    trigger_config JSONB DEFAULT '{}',
    steps JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- WORKFLOW_LOGS
CREATE TABLE IF NOT EXISTS public.workflow_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    execution_details JSONB DEFAULT '{}',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. MEMBERSHIPS & PACKS
-- ============================================

-- MEMBERSHIPS
CREATE TABLE IF NOT EXISTS public.memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_name TEXT NOT NULL,
    price_inr DECIMAL(12, 2) NOT NULL,
    duration_days INT DEFAULT 30,
    features JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MEMBERSHIP_REQUESTS (The missing table)
CREATE TABLE IF NOT EXISTS public.membership_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    requested_packs TEXT[] NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- USER_SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    membership_id UUID NOT NULL REFERENCES public.memberships(id),
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 7. ADMIN & LEADS
-- ============================================

-- OWNER_LEADS (Public capture)
CREATE TABLE IF NOT EXISTS public.owner_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    phone TEXT NOT NULL,
    business_name TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- APPROVED_OWNERS
CREATE TABLE IF NOT EXISTS public.approved_owners (
    email TEXT PRIMARY KEY,
    approved_at TIMESTAMPTZ DEFAULT now(),
    notes TEXT
);

-- ============================================
-- 8. PROFILE BACKFILL (For existing Auth users)
-- ============================================
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT id, email, raw_user_meta_data FROM auth.users LOOP
        INSERT INTO public.profiles (
            id, 
            company_name, 
            role, 
            email, 
            is_super_admin,
            can_manage_inventory, 
            can_manage_sales, 
            can_manage_accounting,
            has_sales_pack,
            has_crm_pack,
            has_core_modules_pack,
            has_ai_analysis_pack
        )
        VALUES (
            user_record.id,
            COALESCE(user_record.raw_user_meta_data ->> 'company_name', split_part(user_record.email, '@', 1) || '''s Startup'),
            COALESCE(user_record.raw_user_meta_data ->> 'role', 'owner'),
            user_record.email,
            (user_record.email = 'beast525372@gmail.com'), -- Set Super Admin for the main user
            TRUE, -- Enable all permissions for backfilled owners
            TRUE,
            TRUE,
            TRUE,
            TRUE,
            TRUE,
            TRUE
        )
        ON CONFLICT (id) DO UPDATE SET
            is_super_admin = (user_record.email = 'beast525372@gmail.com');
    END LOOP;
END $$;

-- ============================================
-- 10. MULTI-STORE & B2B
-- ============================================

-- LOCATIONS
CREATE TABLE IF NOT EXISTS public.locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- retail, warehouse, hybrid
    address TEXT,
    phone TEXT,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attach FK from expenses to locations (deferred because locations is created after expenses)
ALTER TABLE public.expenses
    DROP CONSTRAINT IF EXISTS expenses_location_id_fkey;
ALTER TABLE public.expenses
    ADD CONSTRAINT expenses_location_id_fkey
    FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE SET NULL;

-- Attach FK from sales_orders to locations (same reason)
ALTER TABLE public.sales_orders
    DROP CONSTRAINT IF EXISTS sales_orders_location_id_fkey;
ALTER TABLE public.sales_orders
    ADD CONSTRAINT sales_orders_location_id_fkey
    FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE SET NULL;

-- Attach FK from invoices to locations
ALTER TABLE public.invoices
    DROP CONSTRAINT IF EXISTS invoices_location_id_fkey;
ALTER TABLE public.invoices
    ADD CONSTRAINT invoices_location_id_fkey
    FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE SET NULL;

-- LOCATION_INVENTORY
CREATE TABLE IF NOT EXISTS public.location_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    stock_quantity INTEGER DEFAULT 0,
    min_stock_level INTEGER DEFAULT 5,
    last_restock_date TIMESTAMPTZ,
    UNIQUE(location_id, product_id)
);

-- WHOLESALE_TIERS
CREATE TABLE IF NOT EXISTS public.wholesale_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    discount_percentage NUMERIC(5, 2) DEFAULT 0.00,
    min_order_value NUMERIC(15, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- BULK_ORDERS
CREATE TABLE IF NOT EXISTS public.bulk_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    location_id UUID REFERENCES public.locations(id),
    status TEXT DEFAULT 'draft',
    total_amount NUMERIC(15, 2) NOT NULL,
    tax_amount NUMERIC(15, 2) DEFAULT 0.00,
    payment_status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BULK_ORDER_ITEMS
CREATE TABLE IF NOT EXISTS public.bulk_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bulk_order_id UUID REFERENCES public.bulk_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(15, 2) NOT NULL,
    total_price NUMERIC(15, 2) NOT NULL
);

-- CLIENT_PORTALS
CREATE TABLE IF NOT EXISTS public.client_portals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    subdomain TEXT UNIQUE,
    is_active BOOLEAN DEFAULT true,
    theme_config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 11. PREMIUM GLOBAL (LOYALTY & SUBS)
-- ============================================

-- LOYALTY_PROGRAMS
CREATE TABLE IF NOT EXISTS public.loyalty_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    points_per_inr NUMERIC(10, 4) DEFAULT 1.0,
    min_redemption_points INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CUSTOMER_LOYALTY
CREATE TABLE IF NOT EXISTS public.customer_loyalty (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
    points_balance INTEGER DEFAULT 0,
    total_points_earned INTEGER DEFAULT 0,
    tier TEXT DEFAULT 'Standard',
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(owner_id, contact_id)
);

-- SUBSCRIPTION_PLANS
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    price NUMERIC(15, 2) NOT NULL,
    billing_cycle TEXT DEFAULT 'monthly',
    features JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- LOYALTY_TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loyalty_id UUID REFERENCES public.customer_loyalty(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- earn, redeem, adjust
    points INTEGER NOT NULL,
    reason TEXT,
    reference_id UUID, -- order_id or manual_adjustment_id
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 12. TRIGGERS & FUNCTIONS
-- ============================================

-- Security Check for Super Admin
CREATE OR REPLACE FUNCTION public.check_is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_super_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Handle New Auth User
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, company_name, role, email, can_manage_inventory, can_manage_sales, can_manage_accounting)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'company_name', split_part(new.email, '@', 1) || '''s Startup'),
    COALESCE(new.raw_user_meta_data ->> 'role', 'owner'),
    new.email,
    (COALESCE(new.raw_user_meta_data ->> 'role', 'owner') = 'owner'),
    (COALESCE(new.raw_user_meta_data ->> 'role', 'owner') = 'owner'),
    (COALESCE(new.raw_user_meta_data ->> 'role', 'owner') = 'owner')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 9. SECURITY (RLS)
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wholesale_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_portals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_loyalty ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.churn_analysis ENABLE ROW LEVEL SECURITY;

-- Profiles
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.check_is_super_admin());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id OR public.check_is_super_admin());

-- Products (Company-wide access: owner + employees)
DROP POLICY IF EXISTS "products_access" ON public.products;
CREATE POLICY "products_access" ON public.products FOR ALL USING (
  owner_id = auth.uid() 
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND profiles.owner_id = products.owner_id)
);

-- Sales Orders (Company-wide access)
DROP POLICY IF EXISTS "sales_access" ON public.sales_orders;
CREATE POLICY "sales_access" ON public.sales_orders FOR ALL USING (
  owner_id = auth.uid() 
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND profiles.owner_id = sales_orders.owner_id)
);

-- Order Items (access via parent order)
DROP POLICY IF EXISTS "order_items_access" ON public.order_items;
CREATE POLICY "order_items_access" ON public.order_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.sales_orders s 
    WHERE s.id = order_items.order_id AND (
      s.owner_id = auth.uid() 
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.owner_id = s.owner_id)
    )
  )
);

DROP POLICY IF EXISTS "order_items_modify" ON public.order_items;
CREATE POLICY "order_items_modify" ON public.order_items FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.sales_orders s 
    WHERE s.id = order_items.order_id AND (
      s.owner_id = auth.uid() 
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.owner_id = s.owner_id)
    )
  )
);

-- Expenses (Company-wide access — CRITICAL for COGS automation)
DROP POLICY IF EXISTS "expenses_access" ON public.expenses;
CREATE POLICY "expenses_access" ON public.expenses FOR ALL USING (
  owner_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND profiles.owner_id = expenses.owner_id)
);

-- Invoices (Company-wide access)
DROP POLICY IF EXISTS "invoices_access" ON public.invoices;
CREATE POLICY "invoices_access" ON public.invoices FOR ALL USING (
  owner_id = auth.uid() 
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND profiles.owner_id = invoices.owner_id)
);

-- CRM: Contacts (Company-wide access)
DROP POLICY IF EXISTS "crm_access" ON public.contacts;
CREATE POLICY "crm_access" ON public.contacts FOR ALL USING (
  owner_id = auth.uid() 
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND profiles.owner_id = contacts.owner_id)
);

-- CRM: Companies (Company-wide access)
DROP POLICY IF EXISTS "companies_access" ON public.companies;
CREATE POLICY "companies_access" ON public.companies FOR ALL USING (
  owner_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND profiles.owner_id = companies.owner_id)
);

-- Pipeline Stages (SELECT for all including defaults, MODIFY for owner)
DROP POLICY IF EXISTS "pipeline_access" ON public.pipeline_stages;
CREATE POLICY "pipeline_access" ON public.pipeline_stages FOR SELECT USING (
  owner_id IS NULL
  OR owner_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND profiles.owner_id = pipeline_stages.owner_id)
  OR public.check_is_super_admin()
);
DROP POLICY IF EXISTS "pipeline_modify" ON public.pipeline_stages;
CREATE POLICY "pipeline_modify" ON public.pipeline_stages FOR ALL USING (
  owner_id = auth.uid() OR public.check_is_super_admin()
);

-- Deals (Company-wide access)
DROP POLICY IF EXISTS "deals_access" ON public.deals;
CREATE POLICY "deals_access" ON public.deals FOR ALL USING (
  owner_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND profiles.owner_id = deals.owner_id)
  OR public.check_is_super_admin()
);

-- Conversations (Company-wide access)
DROP POLICY IF EXISTS "conversations_access" ON public.conversations;
CREATE POLICY "conversations_access" ON public.conversations FOR ALL USING (
  owner_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND profiles.owner_id = conversations.owner_id)
);

-- Messages (access via conversation or lead ownership)
DROP POLICY IF EXISTS "messages_access" ON public.messages;
CREATE POLICY "messages_access" ON public.messages FOR ALL USING (
  sender_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id AND (
      c.owner_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.owner_id = c.owner_id)
    )
  )
  OR EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = messages.lead_id AND l.owner_id = auth.uid()
  )
);

-- Multi-Store Policies
DROP POLICY IF EXISTS "locations_access" ON public.locations;
DROP POLICY IF EXISTS "wholesale_access" ON public.wholesale_tiers;
DROP POLICY IF EXISTS "bulk_orders_access" ON public.bulk_orders;
CREATE POLICY "locations_access" ON public.locations FOR ALL USING (owner_id = auth.uid() OR public.check_is_super_admin());
CREATE POLICY "wholesale_access" ON public.wholesale_tiers FOR ALL USING (owner_id = auth.uid() OR public.check_is_super_admin());
CREATE POLICY "bulk_orders_access" ON public.bulk_orders FOR ALL USING (owner_id = auth.uid() OR public.check_is_super_admin());

-- Location Inventory (access via location ownership)
DROP POLICY IF EXISTS "location_inventory_access" ON public.location_inventory;
CREATE POLICY "location_inventory_access" ON public.location_inventory FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.locations l WHERE l.id = location_inventory.location_id AND (
      l.owner_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.owner_id = l.owner_id)
    )
  )
);

-- Bulk Order Items (access via bulk order ownership)
DROP POLICY IF EXISTS "bulk_order_items_access" ON public.bulk_order_items;
CREATE POLICY "bulk_order_items_access" ON public.bulk_order_items FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.bulk_orders bo WHERE bo.id = bulk_order_items.bulk_order_id AND (
      bo.owner_id = auth.uid() OR public.check_is_super_admin()
    )
  )
);

-- Client Portals
DROP POLICY IF EXISTS "client_portals_access" ON public.client_portals;
CREATE POLICY "client_portals_access" ON public.client_portals FOR ALL USING (
  owner_id = auth.uid() OR public.check_is_super_admin()
);

-- Alerts & Insights
DROP POLICY IF EXISTS "alerts_access" ON public.smart_alerts;
DROP POLICY IF EXISTS "insights_access" ON public.ai_insights;
DROP POLICY IF EXISTS "forecasts_access" ON public.performance_forecasts;
CREATE POLICY "alerts_access" ON public.smart_alerts FOR ALL USING (owner_id = auth.uid());
CREATE POLICY "insights_access" ON public.ai_insights FOR ALL USING (owner_id = auth.uid());
CREATE POLICY "forecasts_access" ON public.performance_forecasts FOR SELECT USING (owner_id = auth.uid());

-- Churn Analysis
DROP POLICY IF EXISTS "churn_analysis_access" ON public.churn_analysis;
CREATE POLICY "churn_analysis_access" ON public.churn_analysis FOR ALL USING (
  owner_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND profiles.owner_id = churn_analysis.owner_id)
);

-- Automation Policies
DROP POLICY IF EXISTS "leads_access" ON public.leads;
DROP POLICY IF EXISTS "sequences_access" ON public.automation_sequences;
DROP POLICY IF EXISTS "jobs_access" ON public.automation_jobs;
DROP POLICY IF EXISTS "configs_access" ON public.user_configs;
CREATE POLICY "leads_access" ON public.leads FOR ALL USING (owner_id = auth.uid());
CREATE POLICY "sequences_access" ON public.automation_sequences FOR ALL USING (owner_id = auth.uid());
CREATE POLICY "jobs_access" ON public.automation_jobs FOR ALL USING (owner_id = auth.uid());
CREATE POLICY "configs_access" ON public.user_configs FOR ALL USING (owner_id = auth.uid());

-- Workflow Policies
DROP POLICY IF EXISTS "workflows_access" ON public.workflows;
DROP POLICY IF EXISTS "workflow_logs_access" ON public.workflow_logs;
CREATE POLICY "workflows_access" ON public.workflows FOR ALL USING (owner_id = auth.uid());
CREATE POLICY "workflow_logs_access" ON public.workflow_logs FOR SELECT USING (owner_id = auth.uid());

-- Notifications
DROP POLICY IF EXISTS "notifications_access" ON public.notifications;
CREATE POLICY "notifications_access" ON public.notifications FOR ALL USING (user_id = auth.uid() OR owner_id = auth.uid() OR public.check_is_super_admin());

-- Membership Requests
DROP POLICY IF EXISTS "Owners manage their requests" ON public.membership_requests;
CREATE POLICY "Owners manage their requests" ON public.membership_requests FOR ALL USING (auth.uid() = owner_id OR public.check_is_super_admin());

-- Memberships (public catalog)
DROP POLICY IF EXISTS "memberships_read" ON public.memberships;
CREATE POLICY "memberships_read" ON public.memberships FOR SELECT USING (true);
DROP POLICY IF EXISTS "memberships_admin" ON public.memberships;
CREATE POLICY "memberships_admin" ON public.memberships FOR ALL USING (public.check_is_super_admin());

-- User Subscriptions
DROP POLICY IF EXISTS "user_subscriptions_access" ON public.user_subscriptions;
CREATE POLICY "user_subscriptions_access" ON public.user_subscriptions FOR ALL USING (
  user_id = auth.uid() OR public.check_is_super_admin()
);

-- Employee Requests
DROP POLICY IF EXISTS "employee_requests_access" ON public.employee_requests;
CREATE POLICY "employee_requests_access" ON public.employee_requests FOR ALL USING (
  owner_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  OR employee_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  OR public.check_is_super_admin()
);

-- Loyalty Programs
DROP POLICY IF EXISTS "loyalty_programs_access" ON public.loyalty_programs;
CREATE POLICY "loyalty_programs_access" ON public.loyalty_programs FOR ALL USING (
  owner_id = auth.uid() OR public.check_is_super_admin()
);

-- Customer Loyalty (Company-wide)
DROP POLICY IF EXISTS "customer_loyalty_access" ON public.customer_loyalty;
CREATE POLICY "customer_loyalty_access" ON public.customer_loyalty FOR ALL USING (
  owner_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND profiles.owner_id = customer_loyalty.owner_id)
);

-- Loyalty Transactions (access via loyalty record)
DROP POLICY IF EXISTS "loyalty_transactions_access" ON public.loyalty_transactions;
CREATE POLICY "loyalty_transactions_access" ON public.loyalty_transactions FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.customer_loyalty cl WHERE cl.id = loyalty_transactions.loyalty_id AND (
      cl.owner_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.owner_id = cl.owner_id)
    )
  )
);

-- Subscription Plans (public catalog)
DROP POLICY IF EXISTS "subscription_plans_read" ON public.subscription_plans;
CREATE POLICY "subscription_plans_read" ON public.subscription_plans FOR SELECT USING (true);
DROP POLICY IF EXISTS "subscription_plans_admin" ON public.subscription_plans;
CREATE POLICY "subscription_plans_admin" ON public.subscription_plans FOR ALL USING (public.check_is_super_admin());

-- Admin
DROP POLICY IF EXISTS "Public can lead" ON public.owner_leads;
DROP POLICY IF EXISTS "Admin leads" ON public.owner_leads;
CREATE POLICY "Public can lead" ON public.owner_leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin leads" ON public.owner_leads FOR SELECT USING (public.check_is_super_admin());

-- ============================================
-- 13. UTILITY FUNCTIONS
-- ============================================

-- Stock increment/decrement helper for order editing
DROP FUNCTION IF EXISTS public.increment_stock(UUID, INTEGER);
CREATE OR REPLACE FUNCTION public.increment_stock(p_product_id UUID, p_amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE public.products
  SET stock_quantity = stock_quantity + p_amount,
      updated_at = NOW()
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 14. SEED DATA
-- ============================================

INSERT INTO public.memberships (plan_name, price_inr, duration_days, features)
VALUES 
('Starter', 499.00, 30, '["Inventory", "Sales", "Basic Reports"]'),
('Growth', 1499.00, 30, '["Inventory", "Sales", "Accounting", "AI Marketing", "Team of 5"]'),
('Enterprise', 4999.00, 30, '["All Features", "Unlimited Team", "Priority Support"]')
ON CONFLICT DO NOTHING;

INSERT INTO public.pipeline_stages (name, order_index, probability, is_default) VALUES
('Lead', 0, 10, true),
('Contacted', 1, 20, true),
('Meeting Scheduled', 2, 40, true),
('Proposal Sent', 3, 60, true),
('Negotiation', 4, 80, true),
('Contract Sent', 5, 90, true)
ON CONFLICT DO NOTHING;

-- ============================================
-- 15. REALTIME
-- ============================================
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE 
    public.profiles,
    public.products,
    public.sales_orders,
    public.expenses,
    public.invoices,
    public.employee_requests,
    public.membership_requests,
    public.leads,
    public.messages,
    public.pipeline_stages,
    public.automation_sequences,
    public.automation_jobs,
    public.smart_alerts,
    public.ai_insights,
    public.locations,
    public.wholesale_tiers,
    public.bulk_orders,
    public.notifications,
    public.customer_loyalty,
    public.loyalty_transactions;
COMMIT;
