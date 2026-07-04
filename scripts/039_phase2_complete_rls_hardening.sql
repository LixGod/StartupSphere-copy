-- ============================================================
-- PHASE 2: COMPLETE RLS HARDENING
-- Generated: 2026-06-01
-- ============================================================
-- This script:
--   1) Creates helper functions for store-based access
--   2) Drops ALL existing policies for a clean slate
--   3) Enables RLS on every public table
--   4) Creates corrected, per-table policies
-- ============================================================

-- ============================================================
-- STEP 1: HELPER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION user_has_store_access(p_store_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM locations
    WHERE id = p_store_id
    AND owner_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_store_owner(p_store_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM locations
    WHERE id = p_store_id
    AND owner_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================
-- STEP 2: DROP ALL EXISTING POLICIES (Clean Slate)
-- ============================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- ============================================================
-- STEP 3: ENABLE RLS ON ALL 40 TABLES
-- ============================================================

ALTER TABLE public.owner_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approved_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.churn_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wholesale_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_portals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_loyalty ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_configs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 4: CREATE ALL POLICIES
-- ============================================================

-- ========================
-- profiles (owner col = id)
-- ========================
CREATE POLICY "user_manages_own_profile" ON profiles
FOR ALL USING (auth.uid() = id);

-- ========================
-- contacts (owner col = owner_id)
-- ========================
CREATE POLICY "owner_select_contacts" ON contacts
FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "owner_insert_contacts" ON contacts
FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "owner_update_contacts" ON contacts
FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "owner_delete_contacts" ON contacts
FOR DELETE USING (auth.uid() = owner_id);

-- ========================
-- companies (owner col = owner_id)
-- ========================
CREATE POLICY "owner_select_companies" ON companies
FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "owner_insert_companies" ON companies
FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "owner_update_companies" ON companies
FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "owner_delete_companies" ON companies
FOR DELETE USING (auth.uid() = owner_id);

-- ========================
-- pipeline_stages (owner col = owner_id)
-- ========================
CREATE POLICY "owner_select_pipeline_stages" ON pipeline_stages
FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "owner_insert_pipeline_stages" ON pipeline_stages
FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "owner_update_pipeline_stages" ON pipeline_stages
FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "owner_delete_pipeline_stages" ON pipeline_stages
FOR DELETE USING (auth.uid() = owner_id);

-- ========================
-- deals (owner col = owner_id)
-- ========================
CREATE POLICY "owner_select_deals" ON deals
FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "owner_insert_deals" ON deals
FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "owner_update_deals" ON deals
FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "owner_delete_deals" ON deals
FOR DELETE USING (auth.uid() = owner_id);

-- ========================
-- deal_activities (linked via deal_id)
-- ========================
CREATE POLICY "owner_all_deal_activities" ON deal_activities
FOR ALL USING (
  auth.uid() IN (
    SELECT owner_id FROM deals WHERE id = deal_activities.deal_id
  )
);

-- ========================
-- smart_alerts (owner col = owner_id)
-- ========================
CREATE POLICY "owner_select_smart_alerts" ON smart_alerts
FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "owner_insert_smart_alerts" ON smart_alerts
FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "owner_update_smart_alerts" ON smart_alerts
FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "owner_delete_smart_alerts" ON smart_alerts
FOR DELETE USING (auth.uid() = owner_id);

-- ========================
-- conversations (owner col = owner_id)
-- ========================
CREATE POLICY "owner_select_conversations" ON conversations
FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "owner_insert_conversations" ON conversations
FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "owner_update_conversations" ON conversations
FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "owner_delete_conversations" ON conversations
FOR DELETE USING (auth.uid() = owner_id);

-- ========================
-- messages (CORRECTION 2 — linked via sender_id or conversation)
-- ========================
CREATE POLICY "owner_all_messages" ON messages
FOR ALL USING (
  auth.uid() = sender_id
  OR conversation_id IN (
    SELECT id FROM conversations WHERE owner_id = auth.uid()
  )
);

-- ========================
-- ai_insights (owner col = owner_id)
-- ========================
CREATE POLICY "owner_select_ai_insights" ON ai_insights
FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "owner_insert_ai_insights" ON ai_insights
FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "owner_update_ai_insights" ON ai_insights
FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "owner_delete_ai_insights" ON ai_insights
FOR DELETE USING (auth.uid() = owner_id);

-- ========================
-- performance_forecasts (owner col = owner_id)
-- ========================
CREATE POLICY "owner_select_performance_forecasts" ON performance_forecasts
FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "owner_insert_performance_forecasts" ON performance_forecasts
FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "owner_update_performance_forecasts" ON performance_forecasts
FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "owner_delete_performance_forecasts" ON performance_forecasts
FOR DELETE USING (auth.uid() = owner_id);

-- ========================
-- churn_analysis (owner col = owner_id)
-- ========================
CREATE POLICY "owner_select_churn_analysis" ON churn_analysis
FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "owner_insert_churn_analysis" ON churn_analysis
FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "owner_update_churn_analysis" ON churn_analysis
FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "owner_delete_churn_analysis" ON churn_analysis
FOR DELETE USING (auth.uid() = owner_id);

-- ========================
-- locations (owner col = owner_id) — Store-based
-- ========================
CREATE POLICY "owner_select_locations" ON locations
FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "owner_insert_locations" ON locations
FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "owner_update_locations" ON locations
FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "owner_delete_locations" ON locations
FOR DELETE USING (auth.uid() = owner_id);

-- ========================
-- location_inventory (CORRECTION 7 — linked via location_id)
-- ========================
CREATE POLICY "owner_all_location_inventory" ON location_inventory
FOR ALL USING (
  location_id IN (
    SELECT id FROM locations WHERE owner_id = auth.uid()
  )
);

-- ========================
-- wholesale_tiers (owner col = owner_id) — Store-based
-- ========================
CREATE POLICY "owner_select_wholesale_tiers" ON wholesale_tiers
FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "owner_insert_wholesale_tiers" ON wholesale_tiers
FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "owner_update_wholesale_tiers" ON wholesale_tiers
FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "owner_delete_wholesale_tiers" ON wholesale_tiers
FOR DELETE USING (auth.uid() = owner_id);

-- ========================
-- client_portals (owner col = owner_id) — Store-based
-- ========================
CREATE POLICY "owner_select_client_portals" ON client_portals
FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "owner_insert_client_portals" ON client_portals
FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "owner_update_client_portals" ON client_portals
FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "owner_delete_client_portals" ON client_portals
FOR DELETE USING (auth.uid() = owner_id);

-- ========================
-- bulk_orders (owner col = owner_id) — Store-based
-- ========================
CREATE POLICY "owner_select_bulk_orders" ON bulk_orders
FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "owner_insert_bulk_orders" ON bulk_orders
FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "owner_update_bulk_orders" ON bulk_orders
FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "owner_delete_bulk_orders" ON bulk_orders
FOR DELETE USING (auth.uid() = owner_id);

-- ========================
-- bulk_order_items (CORRECTION 6 — linked via bulk_order_id)
-- ========================
CREATE POLICY "owner_all_bulk_order_items" ON bulk_order_items
FOR ALL USING (
  bulk_order_id IN (
    SELECT id FROM bulk_orders WHERE owner_id = auth.uid()
  )
);

-- ========================
-- loyalty_programs (owner col = owner_id)
-- ========================
CREATE POLICY "owner_select_loyalty_programs" ON loyalty_programs
FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "owner_insert_loyalty_programs" ON loyalty_programs
FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "owner_update_loyalty_programs" ON loyalty_programs
FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "owner_delete_loyalty_programs" ON loyalty_programs
FOR DELETE USING (auth.uid() = owner_id);

-- ========================
-- customer_loyalty (owner col = owner_id)
-- ========================
CREATE POLICY "owner_select_customer_loyalty" ON customer_loyalty
FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "owner_insert_customer_loyalty" ON customer_loyalty
FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "owner_update_customer_loyalty" ON customer_loyalty
FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "owner_delete_customer_loyalty" ON customer_loyalty
FOR DELETE USING (auth.uid() = owner_id);

-- ========================
-- loyalty_transactions (CORRECTION 4 — linked via loyalty_id)
-- ========================
CREATE POLICY "owner_all_loyalty_transactions" ON loyalty_transactions
FOR ALL USING (
  loyalty_id IN (
    SELECT id FROM customer_loyalty WHERE owner_id = auth.uid()
  )
);

-- ========================
-- subscription_plans (global read, no owner)
-- ========================
CREATE POLICY "public_read_plans" ON subscription_plans
FOR SELECT USING (true);

-- ========================
-- membership_requests (owner col = owner_id)
-- ========================
CREATE POLICY "owner_select_membership_requests" ON membership_requests
FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "owner_insert_membership_requests" ON membership_requests
FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "owner_update_membership_requests" ON membership_requests
FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "owner_delete_membership_requests" ON membership_requests
FOR DELETE USING (auth.uid() = owner_id);

-- ========================
-- workflows (owner col = owner_id)
-- ========================
CREATE POLICY "owner_select_workflows" ON workflows
FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "owner_insert_workflows" ON workflows
FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "owner_update_workflows" ON workflows
FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "owner_delete_workflows" ON workflows
FOR DELETE USING (auth.uid() = owner_id);

-- ========================
-- workflow_logs (owner col = owner_id)
-- ========================
CREATE POLICY "owner_select_workflow_logs" ON workflow_logs
FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "owner_insert_workflow_logs" ON workflow_logs
FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "owner_update_workflow_logs" ON workflow_logs
FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "owner_delete_workflow_logs" ON workflow_logs
FOR DELETE USING (auth.uid() = owner_id);

-- ========================
-- products (owner col = owner_id)
-- ========================
CREATE POLICY "owner_select_products" ON products
FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "owner_insert_products" ON products
FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "owner_update_products" ON products
FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "owner_delete_products" ON products
FOR DELETE USING (auth.uid() = owner_id);

-- ========================
-- sales_orders (owner col = owner_id)
-- ========================
CREATE POLICY "owner_select_sales_orders" ON sales_orders
FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "owner_insert_sales_orders" ON sales_orders
FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "owner_update_sales_orders" ON sales_orders
FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "owner_delete_sales_orders" ON sales_orders
FOR DELETE USING (auth.uid() = owner_id);

-- ========================
-- order_items (CORRECTION 5 — linked via order_id)
-- ========================
CREATE POLICY "owner_all_order_items" ON order_items
FOR ALL USING (
  order_id IN (
    SELECT id FROM sales_orders WHERE owner_id = auth.uid()
  )
);

-- ========================
-- expenses (owner col = owner_id)
-- ========================
CREATE POLICY "owner_select_expenses" ON expenses
FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "owner_insert_expenses" ON expenses
FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "owner_update_expenses" ON expenses
FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "owner_delete_expenses" ON expenses
FOR DELETE USING (auth.uid() = owner_id);

-- ========================
-- invoices (owner col = owner_id)
-- SPECIAL: Preserve public SELECT for /receipt/[id] page
-- Only restrict INSERT, UPDATE, DELETE to owner
-- ========================
CREATE POLICY "public_select_invoices" ON invoices
FOR SELECT USING (true);

CREATE POLICY "owner_insert_invoices" ON invoices
FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "owner_update_invoices" ON invoices
FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "owner_delete_invoices" ON invoices
FOR DELETE USING (auth.uid() = owner_id);

-- ========================
-- employee_requests (CORRECTION 3 — email-based via profiles)
-- ========================
CREATE POLICY "owner_read_employee_requests" ON employee_requests
FOR SELECT USING (
  auth.uid() IN (
    SELECT id FROM profiles
    WHERE email = employee_requests.owner_email
  )
);

CREATE POLICY "employee_read_own_request" ON employee_requests
FOR SELECT USING (
  auth.uid() IN (
    SELECT id FROM profiles
    WHERE email = employee_requests.employee_email
  )
);

-- Allow unauthenticated inserts for the signup form
CREATE POLICY "public_insert_employee_requests" ON employee_requests
FOR INSERT WITH CHECK (true);

-- ========================
-- notifications (owner col = user_id)
-- ========================
CREATE POLICY "user_reads_own_notifications" ON notifications
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_updates_own_notifications" ON notifications
FOR UPDATE USING (auth.uid() = user_id);

-- Allow inserts from owner_id (the system/owner creates notifications for users)
CREATE POLICY "owner_inserts_notifications" ON notifications
FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- ========================
-- memberships (global read catalog)
-- ========================
CREATE POLICY "public_read_memberships" ON memberships
FOR SELECT USING (true);

-- ========================
-- user_subscriptions (owner col = user_id)
-- ========================
CREATE POLICY "user_all_own_subscriptions" ON user_subscriptions
FOR ALL USING (auth.uid() = user_id);

-- ========================
-- automation_sequences (owner col = owner_id)
-- ========================
CREATE POLICY "owner_select_automation_sequences" ON automation_sequences
FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "owner_insert_automation_sequences" ON automation_sequences
FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "owner_update_automation_sequences" ON automation_sequences
FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "owner_delete_automation_sequences" ON automation_sequences
FOR DELETE USING (auth.uid() = owner_id);

-- ========================
-- leads (owner col = owner_id)
-- ========================
CREATE POLICY "owner_select_leads" ON leads
FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "owner_insert_leads" ON leads
FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "owner_update_leads" ON leads
FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "owner_delete_leads" ON leads
FOR DELETE USING (auth.uid() = owner_id);

-- ========================
-- automation_jobs (owner col = owner_id)
-- ========================
CREATE POLICY "owner_select_automation_jobs" ON automation_jobs
FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "owner_insert_automation_jobs" ON automation_jobs
FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "owner_update_automation_jobs" ON automation_jobs
FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "owner_delete_automation_jobs" ON automation_jobs
FOR DELETE USING (auth.uid() = owner_id);

-- ========================
-- user_configs (owner col = owner_id)
-- ========================
CREATE POLICY "owner_select_user_configs" ON user_configs
FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "owner_insert_user_configs" ON user_configs
FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "owner_update_user_configs" ON user_configs
FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "owner_delete_user_configs" ON user_configs
FOR DELETE USING (auth.uid() = owner_id);

-- ========================
-- owner_leads (public capture form — no owner column)
-- ========================
CREATE POLICY "public_insert_owner_leads" ON owner_leads
FOR INSERT WITH CHECK (true);

CREATE POLICY "admin_all_owner_leads" ON owner_leads
FOR ALL USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);

-- ========================
-- approved_owners (CORRECTION 1 — email-only table, lookup via profiles)
-- ========================
CREATE POLICY "admin_all_approved_owners" ON approved_owners
FOR ALL USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  )
);

CREATE POLICY "owner_read_own_approval" ON approved_owners
FOR SELECT USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE email = approved_owners.email
  )
);

-- ============================================================
-- DONE: All 40 tables now have RLS enabled with corrected policies
-- ============================================================
