-- ============================================================
-- FIX: CUSTOMERS, MANUFACTURERS AUTO-UPDATE & COGS / EXPENSE PAYMENTS
-- Run in Supabase SQL Editor.
-- ============================================================

-- 0. Schema Hardening
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_order_date timestamptz;

-- Fix RLS Policies for customers & manufacturers (ensure WITH CHECK clause for INSERTs)
DROP POLICY IF EXISTS "customers_team_access" ON customers;
CREATE POLICY "customers_team_access" ON customers
FOR ALL
USING (
  owner_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.owner_id = customers.owner_id
  )
)
WITH CHECK (
  owner_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.owner_id = customers.owner_id
  )
);

DROP POLICY IF EXISTS "manufacturers_team_access" ON manufacturers;
CREATE POLICY "manufacturers_team_access" ON manufacturers
FOR ALL
USING (
  owner_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.owner_id = manufacturers.owner_id
  )
)
WITH CHECK (
  owner_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.owner_id = manufacturers.owner_id
  )
);

-- Fix COGS Expenses: Set payment_status to 'paid', amount_paid = amount, balance_due = 0
UPDATE expenses
SET amount_paid = amount,
    balance_due = 0,
    payment_status = 'paid',
    updated_at = now()
WHERE category = 'Cost of Goods Sold' OR LOWER(category) LIKE '%cogs%';

-- Trigger to auto-mark COGS expenses as paid on insert/update
CREATE OR REPLACE FUNCTION auto_pay_cogs_expense()
RETURNS trigger AS $$
BEGIN
  IF NEW.category = 'Cost of Goods Sold' OR LOWER(NEW.category) LIKE '%cogs%' THEN
    NEW.amount_paid := NEW.amount;
    NEW.balance_due := 0;
    NEW.payment_status := 'paid';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_pay_cogs ON expenses;
CREATE TRIGGER trg_auto_pay_cogs
  BEFORE INSERT OR UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION auto_pay_cogs_expense();


-- 1. Automatic Customer Auto-Link Trigger on sales_orders
CREATE OR REPLACE FUNCTION auto_link_customer_on_sales_order()
RETURNS trigger AS $$
DECLARE
  v_cust_id uuid;
BEGIN
  IF NEW.customer_name IS NOT NULL AND LOWER(NEW.customer_name) != 'walk-in customer' THEN
    -- Look up customer by phone or name
    IF NEW.customer_phone IS NOT NULL AND LENGTH(TRIM(NEW.customer_phone)) > 0 THEN
      SELECT id INTO v_cust_id FROM customers
      WHERE owner_id = NEW.owner_id AND phone = NEW.customer_phone
      LIMIT 1;
    ELSE
      SELECT id INTO v_cust_id FROM customers
      WHERE owner_id = NEW.owner_id AND LOWER(name) = LOWER(NEW.customer_name)
      LIMIT 1;
    END IF;

    -- If customer doesn't exist, create customer row
    IF v_cust_id IS NULL THEN
      INSERT INTO customers (owner_id, name, phone, email, total_purchases, last_order_date)
      VALUES (NEW.owner_id, NEW.customer_name, NEW.customer_phone, NEW.customer_email, COALESCE(NEW.total_amount, 0), now())
      RETURNING id INTO v_cust_id;
    ELSE
      -- Update customer total purchases and last order date
      UPDATE customers SET
        name = COALESCE(NEW.customer_name, name),
        phone = COALESCE(NEW.customer_phone, phone),
        email = COALESCE(NEW.customer_email, email),
        total_purchases = COALESCE(total_purchases, 0) + COALESCE(NEW.total_amount, 0),
        last_order_date = now(),
        updated_at = now()
      WHERE id = v_cust_id;
    END IF;

    NEW.customer_id := v_cust_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_link_customer ON sales_orders;
CREATE TRIGGER trg_auto_link_customer
  BEFORE INSERT ON sales_orders
  FOR EACH ROW EXECUTE FUNCTION auto_link_customer_on_sales_order();


-- 2. Automatic Manufacturer Auto-Link Trigger on expenses
CREATE OR REPLACE FUNCTION auto_link_manufacturer_on_expense()
RETURNS trigger AS $$
DECLARE
  v_mfr_name text;
  v_mfr_id uuid;
BEGIN
  IF NEW.manufacturer_id IS NOT NULL THEN
    -- Recalculate total purchased on manufacturer (excluding COGS)
    IF NEW.category != 'Cost of Goods Sold' AND LOWER(NEW.category) NOT LIKE '%cogs%' THEN
      UPDATE manufacturers SET
        total_purchased = COALESCE(total_purchased, 0) + COALESCE(NEW.amount, 0),
        updated_at = now()
      WHERE id = NEW.manufacturer_id;
    END IF;
  ELSIF NEW.description IS NOT NULL AND NEW.description LIKE 'Purchase from %' THEN
    -- Extract vendor name
    v_mfr_name := TRIM(SPLIT_PART(SUBSTRING(NEW.description FROM 15), ' - ', 1));
    IF LENGTH(v_mfr_name) > 0 AND LOWER(v_mfr_name) != 'unknown vendor' THEN
      SELECT id INTO v_mfr_id FROM manufacturers
      WHERE owner_id = NEW.owner_id AND LOWER(name) = LOWER(v_mfr_name)
      LIMIT 1;

      IF v_mfr_id IS NULL THEN
        INSERT INTO manufacturers (owner_id, name, total_purchased)
        VALUES (NEW.owner_id, v_mfr_name, COALESCE(NEW.amount, 0))
        RETURNING id INTO v_mfr_id;
      ELSE
        UPDATE manufacturers SET
          total_purchased = COALESCE(total_purchased, 0) + COALESCE(NEW.amount, 0),
          updated_at = now()
        WHERE id = v_mfr_id;
      END IF;

      NEW.manufacturer_id := v_mfr_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_link_manufacturer ON expenses;
CREATE TRIGGER trg_auto_link_manufacturer
  BEFORE INSERT ON expenses
  FOR EACH ROW EXECUTE FUNCTION auto_link_manufacturer_on_expense();


-- 3. Update Balance Trigger on Payment Transactions
CREATE OR REPLACE FUNCTION update_balance_on_payment()
RETURNS trigger AS $$
DECLARE
  v_total_paid   decimal(12,2) := 0;
  v_total_amount decimal(12,2) := 0;
  v_cust_id      uuid;
  v_mfr_id       uuid;
  v_mfr_name     text;
BEGIN
  IF NEW.reference_type = 'sale' THEN

    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_paid
    FROM payment_transactions
    WHERE reference_type = 'sale'
      AND reference_id = NEW.reference_id;

    SELECT COALESCE(so.total_amount, 0), so.customer_id
    INTO v_total_amount, v_cust_id
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

    IF v_cust_id IS NOT NULL THEN
      UPDATE customers SET
        total_paid          = COALESCE((SELECT SUM(amount_paid) FROM sales_orders WHERE customer_id = v_cust_id), v_total_paid),
        outstanding_balance = COALESCE((SELECT SUM(balance_due) FROM sales_orders WHERE customer_id = v_cust_id AND payment_status != 'paid'), 0),
        updated_at          = now()
      WHERE id = v_cust_id;
    END IF;

  ELSIF NEW.reference_type = 'purchase' THEN

    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_paid
    FROM payment_transactions
    WHERE reference_type = 'purchase'
      AND reference_id = NEW.reference_id;

    SELECT COALESCE(e.amount, 0), e.manufacturer_id, e.description
    INTO v_total_amount, v_mfr_id, v_mfr_name
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

    -- If manufacturer_id was null, try extracting from description
    IF v_mfr_id IS NULL AND v_mfr_name LIKE 'Purchase from %' THEN
      v_mfr_name := TRIM(SPLIT_PART(SUBSTRING(v_mfr_name FROM 15), ' - ', 1));
      IF LENGTH(v_mfr_name) > 0 THEN
        SELECT id INTO v_mfr_id FROM manufacturers
        WHERE owner_id = NEW.owner_id AND LOWER(name) = LOWER(v_mfr_name)
        LIMIT 1;

        IF v_mfr_id IS NOT NULL THEN
          UPDATE expenses SET manufacturer_id = v_mfr_id WHERE id = NEW.reference_id;
        END IF;
      END IF;
    END IF;

    IF v_mfr_id IS NOT NULL THEN
      UPDATE manufacturers SET
        total_paid          = COALESCE((SELECT SUM(amount_paid) FROM expenses WHERE manufacturer_id = v_mfr_id AND category != 'Cost of Goods Sold'), v_total_paid),
        outstanding_balance = COALESCE((SELECT SUM(balance_due) FROM expenses WHERE manufacturer_id = v_mfr_id AND payment_status != 'paid' AND category != 'Cost of Goods Sold'), 0),
        updated_at          = now()
      WHERE id = v_mfr_id;
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_balance ON payment_transactions;
CREATE TRIGGER trg_update_balance
  AFTER INSERT ON payment_transactions
  FOR EACH ROW EXECUTE FUNCTION update_balance_on_payment();


-- 4. GRANT Privileges
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manufacturers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_transactions TO authenticated;
