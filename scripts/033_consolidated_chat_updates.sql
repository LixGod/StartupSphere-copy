-- StartupSphere Consolidated Update Script
-- Goal: Hardening Multi-Tenant SaaS Architecture & Enterprise Branch Management

-- 1. EXTEND PROFILES WITH SAAS QUOTAS & PACKS
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_sales_pack BOOLEAN DEFAULT TRUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_multi_tenancy_pack BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_core_modules_pack BOOLEAN DEFAULT TRUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_ai_analysis_pack BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_crm_pack BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS max_employees INTEGER DEFAULT 2;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS max_locations INTEGER DEFAULT 1;

-- 2. TENANT-SPECIFIC COMMUNICATION CREDENTIALS
CREATE TABLE IF NOT EXISTS public.tenant_comms_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    provider TEXT NOT NULL, -- 'whatsapp', 'resend', 'smtp', 'sendgrid'
    credentials TEXT NOT NULL, -- Encrypted JSON string
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(owner_id, provider)
);

CREATE TABLE IF NOT EXISTS public.comms_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    whatsapp_phone_number TEXT,
    whatsapp_phone_id TEXT,
    whatsapp_waba_id TEXT,
    email_from_name TEXT,
    email_from_address TEXT,
    verified_domains TEXT[] DEFAULT '{}',
    webhook_secret TEXT DEFAULT gen_random_uuid()::text,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. MESSAGE DELIVERY TRACKING
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent';
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS external_id TEXT;

-- 4. MULTI-STORE CONTEXTUAL SCHEMA
-- Linking sales, invoices, and expenses to specific business locations
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS itc_eligible BOOLEAN DEFAULT FALSE; -- For GST input tax credit tracking

-- 5. MEMBERSHIP & UPGRADE WORKFLOWS
CREATE TABLE IF NOT EXISTS public.membership_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    requested_packs TEXT[] NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. RLS POLICIES FOR NEW TABLES

-- Profiles (Ensure Super Admin can manage everyone)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to avoid infinite recursion in RLS
CREATE OR REPLACE FUNCTION public.check_is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_super_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP POLICY IF EXISTS "Super Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Super Admins can manage all profiles" ON public.profiles
    FOR ALL USING (public.check_is_super_admin());

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Comms Credentials
ALTER TABLE public.tenant_comms_credentials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Credentials only viewable by owner" ON public.tenant_comms_credentials;
CREATE POLICY "Credentials only viewable by owner" ON public.tenant_comms_credentials
    FOR SELECT USING (auth.uid() = owner_id);
DROP POLICY IF EXISTS "Credentials manageable by owner" ON public.tenant_comms_credentials;
CREATE POLICY "Credentials manageable by owner" ON public.tenant_comms_credentials
    FOR ALL USING (auth.uid() = owner_id);

-- Comms Settings
ALTER TABLE public.comms_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Settings viewable by company" ON public.comms_settings;
CREATE POLICY "Settings viewable by company" ON public.comms_settings
    FOR SELECT USING (auth.uid() IN (SELECT id FROM public.profiles WHERE owner_id = comms_settings.owner_id OR id = comms_settings.owner_id));
DROP POLICY IF EXISTS "Settings manageable by owner" ON public.comms_settings;
CREATE POLICY "Settings manageable by owner" ON public.comms_settings
    FOR ALL USING (auth.uid() = owner_id);

-- Membership Requests
ALTER TABLE public.membership_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners can view their own requests" ON public.membership_requests;
CREATE POLICY "Owners can view their own requests" ON public.membership_requests
    FOR SELECT USING (auth.uid() = owner_id);
DROP POLICY IF EXISTS "Owners can create their own requests" ON public.membership_requests;
CREATE POLICY "Owners can create their own requests" ON public.membership_requests
    FOR INSERT WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "Admins can manage all requests" ON public.membership_requests;
CREATE POLICY "Admins can manage all requests" ON public.membership_requests
    FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_super_admin = TRUE));

-- 7. REALTIME ENABLEMENT (Safe approach to avoid "already member" errors)
DO $$
BEGIN
    -- Add comms_settings if not present
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'comms_settings') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.comms_settings;
    END IF;

    -- Add membership_requests if not present
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'membership_requests') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.membership_requests;
    END IF;

    -- Add sales_orders if not present
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'sales_orders') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.sales_orders;
    END IF;

    -- Add invoices if not present
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'invoices') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;
    END IF;

    -- Add expenses if not present
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'expenses') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
    END IF;

    -- Add profiles if not present
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profiles') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
    END IF;

    -- Ensure full data is sent in realtime payloads
    ALTER TABLE public.profiles REPLICA IDENTITY FULL;
END $$;
