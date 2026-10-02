-- ============================================================
-- FIX: order_items INSERT (RLS), cross-table delete sync,
--      and payment trigger ambiguous column reference.
-- Run in Supabase SQL Editor.
-- ============================================================


-- ============================================================
-- 1. FIX order_items RLS: split into SELECT + INSERT + UPDATE/DELETE
--    The old FOR ALL with only USING clause blocks INSERT rows.
-- ============================================================

DROP POLICY IF EXISTS "order_items_access"  ON public.order_items;
DROP POLICY IF EXISTS "order_items_modify"  ON public.order_items;
DROP POLICY IF EXISTS "order_items_select"  ON public.order_items;
DROP POLICY IF EXISTS "order_items_insert"  ON public.order_items;
DROP POLICY IF EXISTS "order_items_update"  ON public.order_items;
DROP POLICY IF EXISTS "order_items_delete"  ON public.order_items;

-- SELECT
CREATE POLICY "order_items_select" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.sales_orders s
      WHERE s.id = order_items.order_id AND (
        s.owner_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.owner_id = s.owner_id)
      )
    )
  );

-- INSERT: check the sales_order being referenced belongs to this user
CREATE POLICY "order_items_insert" ON public.order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sales_orders s
      WHERE s.id = order_items.order_id AND (
        s.owner_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.owner_id = s.owner_id)
      )
    )
  );

-- UPDATE
CREATE POLICY "order_items_update" ON public.order_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.sales_orders s
      WHERE s.id = order_items.order_id AND (
        s.owner_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.owner_id = s.owner_id)
      )
    )
  );

-- DELETE
CREATE POLICY "order_items_delete" ON public.order_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.sales_orders s
      WHERE s.id = order_items.order_id AND (
        s.owner_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.owner_id = s.owner_id)
      )
    )
  );


-- ============================================================
-- 2. Store product_name on order_items so history survives
--    product deletion (run only if column doesn't exist yet)
-- ============================================================

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS product_name text;

-- Backfill existing rows
UPDATE public.order_items oi
SET product_name = p.name
FROM public.products p
WHERE oi.product_id = p.id
  AND oi.product_name IS NULL;

-- Also store product_name on order creation via trigger
CREATE OR REPLACE FUNCTION snapshot_product_name()
RETURNS trigger AS $$
BEGIN
  IF NEW.product_name IS NULL AND NEW.product_id IS NOT NULL THEN
    SELECT name INTO NEW.product_name
    FROM public.products
    WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_snapshot_product_name ON public.order_items;
CREATE TRIGGER trg_snapshot_product_name
  BEFORE INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION snapshot_product_name();


-- ============================================================
-- 3. When a product is deleted:
--    - Restore stock would be wrong (product is gone) — skip
--    - Null out order_items.product_id but keep product_name
--    - Remove any expenses that referenced ONLY that product
--      (only auto-created "purchase" expenses from stock mgmt)
-- ============================================================

-- order_items: SET product_id = NULL on product delete (keep history via product_name)
ALTER TABLE public.order_items
  DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;

ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_product_id_fkey
    FOREIGN KEY (product_id)
    REFERENCES public.products(id)
    ON DELETE SET NULL;

-- sales_orders: cascade totals are kept. Nothing to cascade here.


-- ============================================================
-- 4. FIX: update_balance_on_payment trigger — ambiguous column
-- ============================================================

CREATE OR REPLACE FUNCTION update_balance_on_payment()
RETURNS trigger AS $$
DECLARE
  v_total_paid   decimal(12,2);
  v_total_amount decimal(12,2);
BEGIN
  IF NEW.reference_type = 'sale' THEN

    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_paid
    FROM payment_transactions
    WHERE reference_type = 'sale'
      AND reference_id = NEW.reference_id;

    SELECT COALESCE(so.total_amount, 0)
    INTO v_total_amount
    FROM sales_orders so
    WHERE so.id = NEW.reference_id;

    UPDATE sales_orders SET
      amount_paid    = v_total_paid,
      balance_due    = GREATEST(v_total_amount - v_total_paid, 0),
      payment_status = CASE
        WHEN v_total_paid <= 0              THEN 'unpaid'
        WHEN v_total_paid >= v_total_amount THEN 'paid'
        ELSE 'partial'
      END,
      updated_at = now()
    WHERE id = NEW.reference_id;

    UPDATE customers SET
      total_paid          = v_total_paid,
      outstanding_balance = GREATEST(v_total_amount - v_total_paid, 0),
      updated_at          = now()
    WHERE id = (
      SELECT customer_id FROM sales_orders WHERE id = NEW.reference_id
    );

  ELSIF NEW.reference_type = 'purchase' THEN

    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_paid
    FROM payment_transactions
    WHERE reference_type = 'purchase'
      AND reference_id = NEW.reference_id;

    SELECT COALESCE(e.amount, 0)
    INTO v_total_amount
    FROM expenses e
    WHERE e.id = NEW.reference_id;

    UPDATE expenses SET
      amount_paid    = v_total_paid,
      balance_due    = GREATEST(v_total_amount - v_total_paid, 0),
      payment_status = CASE
        WHEN v_total_paid <= 0              THEN 'unpaid'
        WHEN v_total_paid >= v_total_amount THEN 'paid'
        ELSE 'partial'
      END,
      updated_at = now()
    WHERE id = NEW.reference_id;

    UPDATE manufacturers SET
      total_paid          = v_total_paid,
      outstanding_balance = GREATEST(v_total_amount - v_total_paid, 0),
      updated_at          = now()
    WHERE id = (
      SELECT manufacturer_id FROM expenses WHERE id = NEW.reference_id
    );

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger exists (idempotent)
DROP TRIGGER IF EXISTS trg_update_balance ON payment_transactions;
CREATE TRIGGER trg_update_balance
  AFTER INSERT ON payment_transactions
  FOR EACH ROW EXECUTE FUNCTION update_balance_on_payment();


-- ============================================================
-- 5. GRANT missing privileges for new columns / tables
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manufacturers TO authenticated;

-- ============================================================
-- END
-- ============================================================
