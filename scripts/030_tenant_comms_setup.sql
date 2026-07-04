-- ==========================================================
-- Phase 3: Multi-Tenant Communication Infrastructure
-- ==========================================================

-- 1. Tenant Communication Credentials (Encrypted storage)
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

-- 2. Communication Settings (Per-tenant config)
CREATE TABLE IF NOT EXISTS public.comms_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    whatsapp_phone_number TEXT,
    whatsapp_phone_id TEXT, -- Required for Cloud API
    whatsapp_waba_id TEXT, -- WhatsApp Business Account ID
    email_from_name TEXT,
    email_from_address TEXT,
    verified_domains TEXT[] DEFAULT '{}',
    webhook_secret TEXT DEFAULT gen_random_uuid()::text, -- Secret for validating incoming webhooks
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enhance Messages with Delivery Tracking
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent'; -- sent, delivered, read, failed
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS external_id TEXT; -- ID from provider (WhatsApp message ID)

-- RLS POLICIES --

-- Credentials (Strictly private to the business owner)
ALTER TABLE public.tenant_comms_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Credentials only viewable by owner" ON public.tenant_comms_credentials
    FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Credentials manageable by owner" ON public.tenant_comms_credentials
    FOR ALL USING (auth.uid() = owner_id);

-- Settings
ALTER TABLE public.comms_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Settings viewable by company" ON public.comms_settings
    FOR SELECT USING (auth.uid() IN (SELECT id FROM public.profiles WHERE owner_id = comms_settings.owner_id OR id = comms_settings.owner_id));
CREATE POLICY "Settings manageable by owner" ON public.comms_settings
    FOR ALL USING (auth.uid() = owner_id);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.comms_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages; -- Re-add to ensure new columns are tracked
