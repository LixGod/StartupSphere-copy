-- ==========================================================
-- Phase 4: Dynamic Multi-Currency & Multi-Branch Permissions
-- ==========================================================

-- 1. Exchange Rates Table
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  base_currency varchar(3) NOT NULL DEFAULT 'INR',
  target_currency varchar(3) NOT NULL,
  rate decimal(20, 8) NOT NULL,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_exchange_rates" ON public.exchange_rates;
CREATE POLICY "public_read_exchange_rates" ON public.exchange_rates
FOR SELECT USING (true);

CREATE UNIQUE INDEX IF NOT EXISTS 
  exchange_rates_base_target_idx 
  ON public.exchange_rates(base_currency, target_currency);

-- 2. Add Currency and Active Branch Fields to Profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS currency varchar(3) DEFAULT 'INR',
ADD COLUMN IF NOT EXISTS currency_symbol varchar(5) DEFAULT '₹',
ADD COLUMN IF NOT EXISTS currency_rate decimal(20,8) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS currency_updated_at timestamptz,
ADD COLUMN IF NOT EXISTS active_branch_id uuid REFERENCES public.locations(id);

-- 3. Employee Branch Assignments Table
CREATE TABLE IF NOT EXISTS public.employee_branch_assignments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.locations(id) ON DELETE CASCADE,
  
  -- Permission levels
  can_view_sales boolean DEFAULT true,
  can_create_sales boolean DEFAULT true,
  can_delete_sales boolean DEFAULT false,
  can_view_inventory boolean DEFAULT true,
  can_edit_inventory boolean DEFAULT false,
  can_delete_inventory boolean DEFAULT false,
  can_view_customers boolean DEFAULT true,
  can_edit_customers boolean DEFAULT false,
  can_view_expenses boolean DEFAULT false,
  can_view_reports boolean DEFAULT false,
  can_view_employees boolean DEFAULT false,
  
  is_branch_manager boolean DEFAULT false,
  is_active boolean DEFAULT true,
  assigned_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(employee_id, branch_id)
);

ALTER TABLE public.employee_branch_assignments 
  ENABLE ROW LEVEL SECURITY;

-- Owner sees/manages all their assignments
DROP POLICY IF EXISTS "owner_all_assignments" ON public.employee_branch_assignments;
CREATE POLICY "owner_all_assignments" 
  ON public.employee_branch_assignments
  FOR ALL USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Employee sees their own assignments
DROP POLICY IF EXISTS "employee_read_own_assignments" ON public.employee_branch_assignments;
CREATE POLICY "employee_read_own_assignments" 
  ON public.employee_branch_assignments
  FOR SELECT USING (auth.uid() = employee_id);
