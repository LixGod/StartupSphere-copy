-- ============================================================
-- PHASE 2 VERIFICATION: RLS Status & Policy Audit
-- Run AFTER applying 039_phase2_complete_rls_hardening.sql
-- ============================================================

-- QUERY 1: RLS Status for all public tables
SELECT
  tablename,
  rowsecurity,
  CASE WHEN rowsecurity THEN '✅ RLS ON' ELSE '❌ RLS OFF' END as status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- QUERY 2: All policies on all public tables
SELECT
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
