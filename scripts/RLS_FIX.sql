-- =============================================================================
-- STARTUPSPHERE RLS FIX SCRIPT
-- =============================================================================
-- Run this in the Supabase SQL Editor to fix ALL missing policies.
-- Safe to run multiple times (uses DROP POLICY IF EXISTS before CREATE).
-- =============================================================================

-- ============================================
-- HELPER: Reusable employee-check expression
-- An employee can access data if their profile.owner_id matches the row's owner_id
-- ============================================

-- ============================================
-- FIX 1: EXPENSES (CRITICAL — Accounting + COGS automation broken)
-- ============================================
DROP POLICY IF EXISTS "expenses_access" ON public.expenses;
CREATE POLICY "expenses_access" ON public.expenses FOR ALL USING (
  owner_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND profiles.owner_id = expenses.owner_id)
);

-- ============================================
-- FIX 2: COMPANIES (CRM companies tab empty)
-- ============================================
DROP POLICY IF EXISTS "companies_access" ON public.companies;
CREATE POLICY "companies_access" ON public.companies FOR ALL USING (
  owner_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND profiles.owner_id = companies.owner_id)
);

-- ============================================
-- FIX 3: CONVERSATIONS (Inbox/messaging broken)
-- ============================================
DROP POLICY IF EXISTS "conversations_access" ON public.conversations;
CREATE POLICY "conversations_access" ON public.conversations FOR ALL USING (
  owner_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND profiles.owner_id = conversations.owner_id)
);

-- ============================================
-- FIX 4: MESSAGES (No messages accessible)
-- ============================================
DROP POLICY IF EXISTS "messages_access" ON public.messages;
CREATE POLICY "messages_access" ON public.messages FOR ALL USING (
  -- Access if you're the sender
  sender_id = auth.uid()
  -- Or if you own the conversation
  OR EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id AND (
      c.owner_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.owner_id = c.owner_id)
    )
  )
  -- Or if the message is linked to a lead you own
  OR EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = messages.lead_id AND l.owner_id = auth.uid()
  )
);

-- ============================================
-- FIX 5: EMPLOYEE_REQUESTS (Team management broken)
-- ============================================
DROP POLICY IF EXISTS "employee_requests_access" ON public.employee_requests;
CREATE POLICY "employee_requests_access" ON public.employee_requests FOR ALL USING (
  -- Owner can see requests sent to their email
  owner_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  -- Employee can see their own request
  OR employee_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  -- Super admin can see all
  OR public.check_is_super_admin()
);

-- ============================================
-- FIX 6: MEMBERSHIPS (Plan catalog — should be publicly readable)
-- ============================================
DROP POLICY IF EXISTS "memberships_read" ON public.memberships;
CREATE POLICY "memberships_read" ON public.memberships FOR SELECT USING (true);

DROP POLICY IF EXISTS "memberships_admin" ON public.memberships;
CREATE POLICY "memberships_admin" ON public.memberships FOR ALL USING (public.check_is_super_admin());

-- ============================================
-- FIX 7: USER_SUBSCRIPTIONS (Subscription status invisible)
-- ============================================
DROP POLICY IF EXISTS "user_subscriptions_access" ON public.user_subscriptions;
CREATE POLICY "user_subscriptions_access" ON public.user_subscriptions FOR ALL USING (
  user_id = auth.uid()
  OR public.check_is_super_admin()
);

-- ============================================
-- FIX 8: PIPELINE_STAGES — Upgrade from SELECT-only to full CRUD
-- (addStage() INSERT was being blocked)
-- ============================================
DROP POLICY IF EXISTS "pipeline_access" ON public.pipeline_stages;
CREATE POLICY "pipeline_access" ON public.pipeline_stages FOR SELECT USING (
  owner_id IS NULL
  OR owner_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND profiles.owner_id = pipeline_stages.owner_id)
  OR public.check_is_super_admin()
);

DROP POLICY IF EXISTS "pipeline_modify" ON public.pipeline_stages;
CREATE POLICY "pipeline_modify" ON public.pipeline_stages FOR ALL USING (
  owner_id = auth.uid()
  OR public.check_is_super_admin()
);

-- ============================================
-- FIX 9: DEALS — Add employee access (was owner-only)
-- ============================================
DROP POLICY IF EXISTS "deals_access" ON public.deals;
CREATE POLICY "deals_access" ON public.deals FOR ALL USING (
  owner_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND profiles.owner_id = deals.owner_id)
  OR public.check_is_super_admin()
);

-- ============================================
-- FIX 10: Enable RLS + Add Policies for unprotected tables
-- ============================================

-- LOCATION_INVENTORY
ALTER TABLE public.location_inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "location_inventory_access" ON public.location_inventory;
CREATE POLICY "location_inventory_access" ON public.location_inventory FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.locations l
    WHERE l.id = location_inventory.location_id AND (
      l.owner_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.owner_id = l.owner_id)
    )
  )
);

-- BULK_ORDER_ITEMS
ALTER TABLE public.bulk_order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bulk_order_items_access" ON public.bulk_order_items;
CREATE POLICY "bulk_order_items_access" ON public.bulk_order_items FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.bulk_orders bo
    WHERE bo.id = bulk_order_items.bulk_order_id AND (
      bo.owner_id = auth.uid()
      OR public.check_is_super_admin()
    )
  )
);

-- CLIENT_PORTALS
ALTER TABLE public.client_portals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "client_portals_access" ON public.client_portals;
CREATE POLICY "client_portals_access" ON public.client_portals FOR ALL USING (
  owner_id = auth.uid() OR public.check_is_super_admin()
);

-- LOYALTY_PROGRAMS
ALTER TABLE public.loyalty_programs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "loyalty_programs_access" ON public.loyalty_programs;
CREATE POLICY "loyalty_programs_access" ON public.loyalty_programs FOR ALL USING (
  owner_id = auth.uid() OR public.check_is_super_admin()
);

-- CUSTOMER_LOYALTY
ALTER TABLE public.customer_loyalty ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "customer_loyalty_access" ON public.customer_loyalty;
CREATE POLICY "customer_loyalty_access" ON public.customer_loyalty FOR ALL USING (
  owner_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND profiles.owner_id = customer_loyalty.owner_id)
);

-- LOYALTY_TRANSACTIONS (access via loyalty record)
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "loyalty_transactions_access" ON public.loyalty_transactions;
CREATE POLICY "loyalty_transactions_access" ON public.loyalty_transactions FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.customer_loyalty cl
    WHERE cl.id = loyalty_transactions.loyalty_id AND (
      cl.owner_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.owner_id = cl.owner_id)
    )
  )
);

-- SUBSCRIPTION_PLANS (public catalog)
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subscription_plans_read" ON public.subscription_plans;
CREATE POLICY "subscription_plans_read" ON public.subscription_plans FOR SELECT USING (true);

DROP POLICY IF EXISTS "subscription_plans_admin" ON public.subscription_plans;
CREATE POLICY "subscription_plans_admin" ON public.subscription_plans FOR ALL USING (public.check_is_super_admin());

-- CHURN_ANALYSIS
ALTER TABLE public.churn_analysis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "churn_analysis_access" ON public.churn_analysis;
CREATE POLICY "churn_analysis_access" ON public.churn_analysis FOR ALL USING (
  owner_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND profiles.owner_id = churn_analysis.owner_id)
);

-- ============================================
-- FIX 11: Create missing increment_stock RPC function
-- (Used in sales order editing for stock reconciliation)
-- ============================================
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
-- DONE! All policies fixed.
-- ============================================
