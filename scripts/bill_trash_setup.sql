-- Migration: Create bill_trash table for deleted/cancelled/refunded sales, inventory products, and accounting expenses
CREATE TABLE IF NOT EXISTS bill_trash (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  category text DEFAULT 'sales', -- 'sales', 'inventory', 'accounting'
  order_id uuid,
  invoice_number text,
  customer_name text,
  customer_phone text,
  total_amount numeric(12,2),
  order_date timestamptz,
  reason text NOT NULL,  -- 'Order deleted', 'Order cancelled', 'Order refunded', 'Product deleted', 'Expense deleted'
  original_data jsonb,   -- Full snapshot for restoration
  trashed_at timestamptz DEFAULT NOW(),
  is_restored boolean DEFAULT false
);

ALTER TABLE bill_trash ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage bill trash" ON bill_trash;
CREATE POLICY "Owners manage bill trash"
  ON bill_trash FOR ALL
  USING (owner_id = auth.uid());
