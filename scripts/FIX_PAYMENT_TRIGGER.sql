-- ============================================================
-- FIX: Ambiguous column reference in update_balance_on_payment
-- The PL/pgSQL variable 'total_amount' clashed with the column
-- 'total_amount' in the SELECT. Renamed variables to v_ prefix.
-- Run in Supabase SQL Editor.
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
        WHEN v_total_paid <= 0            THEN 'unpaid'
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
        WHEN v_total_paid <= 0            THEN 'unpaid'
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

-- ============================================================
-- END FIX
-- ============================================================
