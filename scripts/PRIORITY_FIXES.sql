-- ============================================
-- STARTUP SPHERE — PRIORITY SQL FIXES
-- Run in Supabase SQL Editor
-- Safe to run multiple times (IF NOT EXISTS & DROPS)
-- ============================================

-- 1. Owner email lookup for employee signup
-- Searches auth.users + profiles join
DROP FUNCTION IF EXISTS get_owner_by_email(text);

CREATE OR REPLACE FUNCTION get_owner_by_email(
  p_email text
)
RETURNS uuid AS $$
  SELECT au.id
  FROM auth.users au
  INNER JOIN profiles p ON p.id = au.id
  WHERE LOWER(au.email) = LOWER(p_email)
  AND p.role = 'owner'
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. Add owner_id to profiles if missing
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS owner_id uuid
    REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Fix employee_requests table
ALTER TABLE employee_requests
  ADD COLUMN IF NOT EXISTS owner_id uuid
    REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE employee_requests
  ADD COLUMN IF NOT EXISTS employee_user_id uuid
    REFERENCES auth.users(id) ON DELETE SET NULL;

-- 4. Create employee_permissions if missing
CREATE TABLE IF NOT EXISTS employee_permissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id)
    ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES auth.users(id)
    ON DELETE CASCADE NOT NULL,
  branch_id uuid REFERENCES locations(id)
    ON DELETE SET NULL,
  can_access_sales boolean DEFAULT true,
  can_access_inventory boolean DEFAULT true,
  can_access_accounting boolean DEFAULT false,
  can_access_crm boolean DEFAULT false,
  can_access_employees boolean DEFAULT false,
  can_access_reports boolean DEFAULT false,
  can_access_ai_features boolean DEFAULT false,
  can_access_settings boolean DEFAULT false,
  can_create boolean DEFAULT true,
  can_edit boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE employee_permissions
  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_manages_permissions"
  ON employee_permissions;
CREATE POLICY "owner_manages_permissions"
  ON employee_permissions
  FOR ALL USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "employee_reads_own"
  ON employee_permissions;
CREATE POLICY "employee_reads_own"
  ON employee_permissions
  FOR SELECT USING (auth.uid() = employee_id);

-- 5. Fix RLS: employees see shared owner data
-- Products
DROP POLICY IF EXISTS "products_select" ON products;
CREATE POLICY "products_select" ON products
FOR SELECT USING (
  owner_id = auth.uid() OR
  owner_id IN (
    SELECT owner_id FROM profiles
    WHERE id = auth.uid()
    AND owner_id IS NOT NULL
  )
);

DROP POLICY IF EXISTS "products_insert" ON products;
CREATE POLICY "products_insert" ON products
FOR INSERT WITH CHECK (
  owner_id = auth.uid() OR
  owner_id IN (
    SELECT owner_id FROM profiles
    WHERE id = auth.uid()
    AND owner_id IS NOT NULL
  )
);

DROP POLICY IF EXISTS "products_update" ON products;
CREATE POLICY "products_update" ON products
FOR UPDATE USING (
  owner_id = auth.uid() OR
  owner_id IN (
    SELECT owner_id FROM profiles
    WHERE id = auth.uid()
    AND owner_id IS NOT NULL
  )
);

DROP POLICY IF EXISTS "products_delete" ON products;
CREATE POLICY "products_delete" ON products
FOR DELETE USING (owner_id = auth.uid());

-- Sales orders
DROP POLICY IF EXISTS "orders_select" ON sales_orders;
CREATE POLICY "orders_select" ON sales_orders
FOR SELECT USING (
  owner_id = auth.uid() OR
  owner_id IN (
    SELECT owner_id FROM profiles
    WHERE id = auth.uid()
    AND owner_id IS NOT NULL
  )
);

DROP POLICY IF EXISTS "orders_insert" ON sales_orders;
CREATE POLICY "orders_insert" ON sales_orders
FOR INSERT WITH CHECK (
  owner_id = auth.uid() OR
  owner_id IN (
    SELECT owner_id FROM profiles
    WHERE id = auth.uid()
    AND owner_id IS NOT NULL
  )
);

DROP POLICY IF EXISTS "orders_update" ON sales_orders;
CREATE POLICY "orders_update" ON sales_orders
FOR UPDATE USING (
  owner_id = auth.uid() OR
  owner_id IN (
    SELECT owner_id FROM profiles
    WHERE id = auth.uid()
    AND owner_id IS NOT NULL
  )
);

DROP POLICY IF EXISTS "orders_delete" ON sales_orders;
CREATE POLICY "orders_delete" ON sales_orders
FOR DELETE USING (owner_id = auth.uid());

-- Invoices
DROP POLICY IF EXISTS "invoices_team" ON invoices;
CREATE POLICY "invoices_team" ON invoices
FOR ALL USING (
  owner_id = auth.uid() OR
  owner_id IN (
    SELECT owner_id FROM profiles
    WHERE id = auth.uid()
    AND owner_id IS NOT NULL
  )
);

-- Keep public receipt access
DROP POLICY IF EXISTS "invoices_public" ON invoices;
CREATE POLICY "invoices_public" ON invoices
FOR SELECT USING (true);

-- Expenses
DROP POLICY IF EXISTS "expenses_select" ON expenses;
CREATE POLICY "expenses_select" ON expenses
FOR SELECT USING (
  owner_id = auth.uid() OR
  owner_id IN (
    SELECT owner_id FROM profiles
    WHERE id = auth.uid()
    AND owner_id IS NOT NULL
  )
);

DROP POLICY IF EXISTS "expenses_insert" ON expenses;
CREATE POLICY "expenses_insert" ON expenses
FOR INSERT WITH CHECK (
  owner_id = auth.uid() OR
  owner_id IN (
    SELECT owner_id FROM profiles
    WHERE id = auth.uid()
    AND owner_id IS NOT NULL
  )
);

-- Contacts
DROP POLICY IF EXISTS "contacts_select" ON contacts;
CREATE POLICY "contacts_select" ON contacts
FOR SELECT USING (
  owner_id = auth.uid() OR
  owner_id IN (
    SELECT owner_id FROM profiles
    WHERE id = auth.uid()
    AND owner_id IS NOT NULL
  )
);

DROP POLICY IF EXISTS "contacts_insert" ON contacts;
CREATE POLICY "contacts_insert" ON contacts
FOR INSERT WITH CHECK (
  owner_id = auth.uid() OR
  owner_id IN (
    SELECT owner_id FROM profiles
    WHERE id = auth.uid()
    AND owner_id IS NOT NULL
  )
);

-- 6. Auto-create profile trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, role, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'role',
      'owner'
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.email
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 7. Enable realtime on key tables
ALTER PUBLICATION supabase_realtime
  ADD TABLE employee_permissions;

-- ============================================
-- END OF PRIORITY FIXES
-- ============================================
