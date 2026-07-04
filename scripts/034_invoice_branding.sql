-- 034_invoice_branding.sql
-- Goal: Add persistent branding settings for invoices

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS branding_settings JSONB DEFAULT '{}'::jsonb;
