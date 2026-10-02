-- ============================================
-- NEW FEATURES SCHEMA
-- Run in Supabase SQL Editor before coding
-- ============================================

-- 1. CUSTOMERS TABLE (saved customer profiles)
CREATE TABLE IF NOT EXISTS customers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id)
    ON DELETE CASCADE NOT NULL,
  
  -- Identity
  name text NOT NULL,
  phone text,
  email text,
  address text,
  city text,
  gstin text,
  
  -- Financial tracking
  total_purchases decimal(12,2) DEFAULT 0,
  total_paid decimal(12,2) DEFAULT 0,
  outstanding_balance decimal(12,2) DEFAULT 0,
  credit_limit decimal(12,2) DEFAULT 0,
  advance_balance decimal(12,2) DEFAULT 0,
  
  -- Meta
  notes text,
  tags text[],
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers_team_access" ON customers;
CREATE POLICY "customers_team_access" ON customers
FOR ALL USING (
  owner_id = auth.uid() OR
  owner_id IN (
    SELECT owner_id FROM profiles
    WHERE id = auth.uid()
    AND owner_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_customers_owner
  ON customers(owner_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone
  ON customers(phone);

-- 2. MANUFACTURERS TABLE (saved supplier profiles)
CREATE TABLE IF NOT EXISTS manufacturers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id)
    ON DELETE CASCADE NOT NULL,
  
  -- Identity
  name text NOT NULL,
  phone text,
  email text,
  address text,
  city text,
  gstin text,
  
  -- Financial tracking
  total_purchased decimal(12,2) DEFAULT 0,
  total_paid decimal(12,2) DEFAULT 0,
  outstanding_balance decimal(12,2) DEFAULT 0,
  advance_balance decimal(12,2) DEFAULT 0,
  
  -- Meta
  notes text,
  payment_terms integer DEFAULT 30,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE manufacturers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "manufacturers_team_access" ON manufacturers;
CREATE POLICY "manufacturers_team_access" ON manufacturers
FOR ALL USING (
  owner_id = auth.uid() OR
  owner_id IN (
    SELECT owner_id FROM profiles
    WHERE id = auth.uid()
    AND owner_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_manufacturers_owner
  ON manufacturers(owner_id);

-- 3. PAYMENT TRANSACTIONS TABLE
-- Tracks every partial payment on sales and purchases
CREATE TABLE IF NOT EXISTS payment_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id)
    ON DELETE CASCADE NOT NULL,
  created_by uuid REFERENCES auth.users(id)
    ON DELETE SET NULL,
  
  -- Link to parent record
  reference_type text NOT NULL
    CHECK (reference_type IN (
      'sale', 'purchase', 'expense'
    )),
  reference_id uuid NOT NULL,
  -- sale → sales_orders.id
  -- purchase → expenses.id
  
  -- Payment details
  amount decimal(12,2) NOT NULL,
  payment_method text DEFAULT 'cash'
    CHECK (payment_method IN (
      'cash', 'upi', 'bank_transfer',
      'cheque', 'card', 'advance', 'other'
    )),
  payment_date date DEFAULT CURRENT_DATE,
  notes text,
  
  -- Cheque specific
  cheque_number text,
  cheque_date date,
  cheque_bank text,
  cheque_cleared boolean DEFAULT false,
  cheque_cleared_date date,
  
  -- Reference
  transaction_ref text,
  
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payment_transactions
  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_team_access" ON payment_transactions;
CREATE POLICY "payments_team_access"
  ON payment_transactions
FOR ALL USING (
  owner_id = auth.uid() OR
  owner_id IN (
    SELECT owner_id FROM profiles
    WHERE id = auth.uid()
    AND owner_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_payments_reference
  ON payment_transactions(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_payments_owner
  ON payment_transactions(owner_id);

-- 4. PURCHASE ORDERS TABLE
-- Auto-generated or manual POs to manufacturers
CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id)
    ON DELETE CASCADE NOT NULL,
  manufacturer_id uuid REFERENCES manufacturers(id)
    ON DELETE SET NULL,
  location_id uuid REFERENCES locations(id)
    ON DELETE SET NULL,
  
  po_number text,
  status text DEFAULT 'draft'
    CHECK (status IN (
      'draft', 'sent', 'confirmed',
      'received', 'partial', 'cancelled'
    )),
  
  -- Financials
  subtotal decimal(12,2) DEFAULT 0,
  gst_amount decimal(12,2) DEFAULT 0,
  total_amount decimal(12,2) DEFAULT 0,
  amount_paid decimal(12,2) DEFAULT 0,
  balance_due decimal(12,2) DEFAULT 0,
  
  expected_delivery_date date,
  received_date date,
  notes text,
  
  -- Auto-generated flag
  is_auto_generated boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE purchase_orders
  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "po_team_access" ON purchase_orders;
CREATE POLICY "po_team_access" ON purchase_orders
FOR ALL USING (
  owner_id = auth.uid() OR
  owner_id IN (
    SELECT owner_id FROM profiles
    WHERE id = auth.uid()
    AND owner_id IS NOT NULL
  )
);

-- 5. PURCHASE ORDER ITEMS
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id uuid REFERENCES purchase_orders(id)
    ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id)
    ON DELETE SET NULL,
  
  product_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price decimal(12,2) NOT NULL,
  gst_percent decimal(5,2) DEFAULT 0,
  line_total decimal(12,2) NOT NULL,
  
  quantity_received integer DEFAULT 0,
  
  created_at timestamptz DEFAULT now()
);

ALTER TABLE purchase_order_items
  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "po_items_access" ON purchase_order_items;
CREATE POLICY "po_items_access" ON purchase_order_items
FOR ALL USING (
  purchase_order_id IN (
    SELECT id FROM purchase_orders
    WHERE owner_id = auth.uid()
    OR owner_id IN (
      SELECT owner_id FROM profiles
      WHERE id = auth.uid()
      AND owner_id IS NOT NULL
    )
  )
);

-- 6. CUSTOMER CREDIT LIMITS + ADVANCE
ALTER TABLE sales_orders
  ADD COLUMN IF NOT EXISTS customer_id uuid
    REFERENCES customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS amount_paid decimal(12,2)
    DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_due decimal(12,2)
    DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_status text
    DEFAULT 'unpaid'
    CHECK (payment_status IN (
      'unpaid', 'partial', 'paid', 'advance'
    ));

-- 7. LINK PRODUCTS TO MANUFACTURERS
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS manufacturer_id uuid
    REFERENCES manufacturers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS manufacturer_name text,
  ADD COLUMN IF NOT EXISTS manufacturer_phone text;

-- 8. EXPENSES LINK TO MANUFACTURERS
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS manufacturer_id uuid
    REFERENCES manufacturers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS amount_paid decimal(12,2)
    DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_due decimal(12,2)
    DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_status text
    DEFAULT 'unpaid'
    CHECK (payment_status IN (
      'unpaid', 'partial', 'paid'
    ));

-- 9. SALES TARGETS PER EMPLOYEE
CREATE TABLE IF NOT EXISTS sales_targets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id)
    ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES auth.users(id)
    ON DELETE CASCADE NOT NULL,
  
  target_amount decimal(12,2) NOT NULL,
  achieved_amount decimal(12,2) DEFAULT 0,
  period_month integer NOT NULL,
  period_year integer NOT NULL,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(employee_id, period_month, period_year)
);

ALTER TABLE sales_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "targets_owner_access" ON sales_targets;
CREATE POLICY "targets_owner_access" ON sales_targets
FOR ALL USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "targets_employee_read" ON sales_targets;
CREATE POLICY "targets_employee_read" ON sales_targets
FOR SELECT USING (employee_id = auth.uid());

-- 10. AUTOMATIC BALANCE TRIGGER ON PAYMENT
-- When a payment_transaction is inserted,
-- auto-update the parent record's balance

CREATE OR REPLACE FUNCTION update_balance_on_payment()
RETURNS trigger AS $$
DECLARE
  total_paid decimal(12,2);
  total_amount decimal(12,2);
BEGIN
  IF NEW.reference_type = 'sale' THEN
    -- Sum all payments for this sale
    SELECT COALESCE(SUM(amount), 0)
    INTO total_paid
    FROM payment_transactions
    WHERE reference_type = 'sale'
    AND reference_id = NEW.reference_id;

    -- Get sale total
    SELECT COALESCE(so.total_amount, 0)
    INTO total_amount
    FROM sales_orders so
    WHERE id = NEW.reference_id;

    -- Update sales_order
    UPDATE sales_orders SET
      amount_paid = total_paid,
      balance_due = GREATEST(total_amount - total_paid, 0),
      payment_status = CASE
        WHEN total_paid <= 0 THEN 'unpaid'
        WHEN total_paid >= total_amount THEN 'paid'
        ELSE 'partial'
      END,
      updated_at = now()
    WHERE id = NEW.reference_id;

    -- Update customer outstanding balance
    UPDATE customers SET
      total_paid = total_paid,
      outstanding_balance = GREATEST(
        total_amount - total_paid, 0
      ),
      updated_at = now()
    WHERE id = (
      SELECT customer_id FROM sales_orders
      WHERE id = NEW.reference_id
    );

  ELSIF NEW.reference_type = 'purchase' THEN
    -- Sum all payments for this expense/purchase
    SELECT COALESCE(SUM(amount), 0)
    INTO total_paid
    FROM payment_transactions
    WHERE reference_type = 'purchase'
    AND reference_id = NEW.reference_id;

    SELECT COALESCE(e.amount, 0)
    INTO total_amount
    FROM expenses e
    WHERE id = NEW.reference_id;

    -- Update expense record
    UPDATE expenses SET
      amount_paid = total_paid,
      balance_due = GREATEST(total_amount - total_paid, 0),
      payment_status = CASE
        WHEN total_paid <= 0 THEN 'unpaid'
        WHEN total_paid >= total_amount THEN 'paid'
        ELSE 'partial'
      END,
      updated_at = now()
    WHERE id = NEW.reference_id;

    -- Update manufacturer outstanding
    UPDATE manufacturers SET
      total_paid = total_paid,
      outstanding_balance = GREATEST(
        total_amount - total_paid, 0
      ),
      updated_at = now()
    WHERE id = (
      SELECT manufacturer_id FROM expenses
      WHERE id = NEW.reference_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_payment_inserted
  ON payment_transactions;

CREATE TRIGGER on_payment_inserted
  AFTER INSERT ON payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_balance_on_payment();

-- 11. ENABLE REALTIME
ALTER PUBLICATION supabase_realtime
  ADD TABLE payment_transactions;
ALTER PUBLICATION supabase_realtime
  ADD TABLE customers;
ALTER PUBLICATION supabase_realtime
  ADD TABLE manufacturers;
ALTER PUBLICATION supabase_realtime
  ADD TABLE purchase_orders;

-- ============================================
-- END OF NEW FEATURES SCHEMA
-- ============================================
