-- =============================================================================
-- STARTUPSPHERE EMPLOYEE SIGNUP & VISIBILITY RLS FIXES
-- =============================================================================

-- 1. Create a secure, SECURITY DEFINER helper function to verify if an owner exists.
-- This runs with the privileges of the creator (bypassing client-side RLS) but only returns
-- a BOOLEAN (true/false) rather than exposing profile records to unauthenticated clients.
CREATE OR REPLACE FUNCTION public.check_owner_email_exists(p_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE email = p_email AND role = 'owner'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute access to both authenticated and anonymous roles
GRANT EXECUTE ON FUNCTION public.check_owner_email_exists(TEXT) TO anon, authenticated, service_role;

-- 2. Restore INSERT policy to employee_requests table to allow anonymous submissions.
-- Submissions are marked as 'pending' and are not active until approved by the owner.
DROP POLICY IF EXISTS "employee_requests_insert" ON public.employee_requests;
CREATE POLICY "employee_requests_insert" ON public.employee_requests FOR INSERT WITH CHECK (true);

-- 3. Restore the profiles SELECT policy so owners can see their employees' profiles.
-- FULL_PLATFORM_SETUP.sql dropped this policy and only kept profiles_select_own,
-- which means owners could not load their employee list at all.
DROP POLICY IF EXISTS "profiles_select_employees" ON public.profiles;
CREATE POLICY "profiles_select_employees" ON public.profiles
  FOR SELECT USING (auth.uid() = owner_id);

-- 4. Restore the profiles UPDATE policy so owners can toggle employee permissions
-- (can_manage_inventory, can_manage_sales, can_manage_accounting).
DROP POLICY IF EXISTS "profiles_update_employees" ON public.profiles;
CREATE POLICY "profiles_update_employees" ON public.profiles
  FOR UPDATE USING (auth.uid() = owner_id);
