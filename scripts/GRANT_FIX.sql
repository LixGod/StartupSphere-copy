-- ============================================================
-- GRANT FIX
-- Run in Supabase SQL Editor
-- Gives the 'authenticated' role basic table privileges on all
-- new tables. Without this, 42501 "permission denied" fires
-- before RLS policies are even evaluated.
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.customers TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.manufacturers TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.payment_transactions TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.purchase_orders TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.purchase_order_items TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.sales_targets TO authenticated;

-- Also grant sequence usage (needed for any serial/generated columns)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================
-- END GRANT FIX
-- ============================================================
