-- ============================================================
-- BUG FIXES V2
-- Run in Supabase SQL Editor
-- Fixes:
--   1. Permission denied on customers / manufacturers
--   2. Stock restoration when a sale is deleted (DB trigger)
--   3. reconcile_order_item_stock() RPC for order edits
-- ============================================================

-- ============================================================
-- FIX 1a: customers RLS
-- ============================================================
DROP POLICY IF EXISTS "customers_team_access" ON customers;
CREATE POLICY "customers_team_access" ON customers
FOR ALL USING (
  owner_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.owner_id = customers.owner_id
      AND p.owner_id IS NOT NULL
  )
);

-- ============================================================
-- FIX 1b: manufacturers RLS
-- ============================================================
DROP POLICY IF EXISTS "manufacturers_team_access" ON manufacturers;
CREATE POLICY "manufacturers_team_access" ON manufacturers
FOR ALL USING (
  owner_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.owner_id = manufacturers.owner_id
      AND p.owner_id IS NOT NULL
  )
);

-- ============================================================
-- FIX 1c: payment_transactions RLS
-- ============================================================
DROP POLICY IF EXISTS "payments_team_access" ON payment_transactions;
CREATE POLICY "payments_team_access" ON payment_transactions
FOR ALL USING (
  owner_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.owner_id = payment_transactions.owner_id
      AND p.owner_id IS NOT NULL
  )
);

-- ============================================================
-- FIX 2: Stock restoration trigger on order delete
-- ============================================================
CREATE OR REPLACE FUNCTION restore_stock_on_order_delete()
RETURNS TRIGGER AS $$
DECLARE
  item RECORD;
BEGIN
  FOR item IN
    SELECT product_id, quantity
    FROM order_items
    WHERE order_id = OLD.id
  LOOP
    PERFORM public.increment_stock(item.product_id, item.quantity);
  END LOOP;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_order_deleted ON sales_orders;
CREATE TRIGGER on_order_deleted
  BEFORE DELETE ON sales_orders
  FOR EACH ROW
  EXECUTE FUNCTION restore_stock_on_order_delete();

-- ============================================================
-- FIX 3: RPC for stock reconciliation during order edits
-- ============================================================
CREATE OR REPLACE FUNCTION reconcile_order_item_stock(
  p_product_id UUID,
  p_delta INTEGER
)
RETURNS void AS $$
BEGIN
  UPDATE public.products
  SET stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) + p_delta)
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.reconcile_order_item_stock(UUID, INTEGER)
  TO authenticated;

GRANT EXECUTE ON FUNCTION public.increment_stock(UUID, INTEGER)
  TO authenticated;

-- ============================================================
-- END BUG FIXES V2
-- ============================================================
