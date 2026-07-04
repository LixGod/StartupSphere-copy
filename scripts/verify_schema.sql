-- StartupSphere Schema Verification Script
-- This script checks if the tables, RLS, and triggers are correctly set up.

SELECT 
    table_name, 
    rowsecurity as rls_enabled
FROM 
    pg_tables 
WHERE 
    schemaname = 'public' 
    AND table_name IN (
        'profiles', 'products', 'sales_orders', 'order_items', 
        'expenses', 'invoices', 'contacts', 'companies', 
        'deals', 'pipeline_stages', 'leads', 'automation_sequences',
        'automation_jobs', 'conversations', 'messages', 'notifications',
        'smart_alerts', 'ai_insights', 'locations', 'memberships'
    )
ORDER BY 
    table_name;

-- Check Triggers
SELECT 
    event_object_table as table_name, 
    trigger_name, 
    event_manipulation as event, 
    action_statement as definition
FROM 
    information_schema.triggers 
WHERE 
    trigger_schema = 'public'
ORDER BY 
    table_name;

-- Check Publication
SELECT 
    pubname, 
    schemaname, 
    tablename 
FROM 
    pg_publication_tables 
WHERE 
    pubname = 'supabase_realtime';
