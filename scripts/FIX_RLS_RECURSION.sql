-- ============================================================================
-- FIX RLS INFINITE RECURSION ON PROFILES RELATION
-- Run this script in the Supabase SQL Editor
-- ============================================================================

-- 1. Create SECURITY DEFINER function to lookup user owner_id bypassing RLS
CREATE OR REPLACE FUNCTION get_user_owner_id(p_uid uuid)
RETURNS uuid AS $$
  SELECT COALESCE(owner_id, id)
  FROM profiles
  WHERE id = p_uid
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- 2. Drop existing recursive policies on profiles
DROP POLICY IF EXISTS "Users can view own profile or owner's employees view owner profile" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable select for users" ON profiles;

-- 3. Re-create non-recursive profiles RLS policies
CREATE POLICY "Users can view profiles"
  ON profiles FOR SELECT
  USING (
    auth.uid() = id OR
    owner_id = auth.uid() OR
    id = get_user_owner_id(auth.uid())
  );

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- 4. Update dependent table policies to use SECURITY DEFINER helper function
DROP POLICY IF EXISTS "Owners and assigned employees manage business locations" ON business_locations;
CREATE POLICY "Owners and assigned employees manage business locations"
  ON business_locations FOR ALL
  USING (
    owner_id = auth.uid() OR
    owner_id = get_user_owner_id(auth.uid())
  );

DROP POLICY IF EXISTS "Owners and employees access products" ON products;
CREATE POLICY "Owners and employees access products"
  ON products FOR ALL
  USING (
    owner_id = auth.uid() OR
    owner_id = get_user_owner_id(auth.uid())
  );

-- ============================================================================
-- FIX COMPLETE — Profiles RLS Infinite Recursion Resolved
-- ============================================================================
