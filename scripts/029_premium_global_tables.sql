-- ==========================================================
-- Phase 5: Premium Features & Global Expansion
-- ==========================================================

-- 1. Global Settings (Currency, Language, Timezone)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS base_currency TEXT DEFAULT 'INR';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS language_pref TEXT DEFAULT 'en';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Asia/Kolkata';

-- 2. Loyalty Programs
CREATE TABLE IF NOT EXISTS public.loyalty_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    points_per_rupee NUMERIC(5, 2) DEFAULT 1.00,
    min_redemption_points INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Customer Loyalty Points
CREATE TABLE IF NOT EXISTS public.customer_loyalty (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
    points_balance INTEGER DEFAULT 0,
    total_earned INTEGER DEFAULT 0,
    total_spent INTEGER DEFAULT 0,
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(contact_id)
);

-- 4. Loyalty Transactions
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- earn, redeem, adjustment
    amount INTEGER NOT NULL,
    order_id UUID REFERENCES public.sales_orders(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Premium Subscription Settings
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL, -- free, pro, enterprise
    price_monthly NUMERIC(15, 2) NOT NULL,
    features JSONB NOT NULL, -- { ai_insights: true, multi_store: false, etc. }
    is_active BOOLEAN DEFAULT true
);

-- Link profiles to subscription
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.subscription_plans(id);

-- 6. Currency Exchange Rates (Cached for real-time conversion)
CREATE TABLE IF NOT EXISTS public.exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    base_currency TEXT NOT NULL,
    target_currency TEXT NOT NULL,
    rate NUMERIC(15, 6) NOT NULL,
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(base_currency, target_currency)
);

-- RLS POLICIES --

-- Loyalty
ALTER TABLE public.loyalty_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Loyalty programs viewable by company" ON public.loyalty_programs
    FOR SELECT USING (auth.uid() IN (SELECT id FROM public.profiles WHERE owner_id = loyalty_programs.owner_id OR id = loyalty_programs.owner_id));

ALTER TABLE public.customer_loyalty ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customer loyalty viewable by company" ON public.customer_loyalty
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = customer_loyalty.contact_id AND (c.owner_id = (SELECT owner_id FROM public.profiles WHERE id = auth.uid()) OR c.owner_id = auth.uid())));

-- DEFAULT DATA --

-- Initial Subscription Plans
INSERT INTO public.subscription_plans (name, price_monthly, features) VALUES
('Free', 0, '{"ai_insights": false, "multi_store": false, "helpdesk": false, "loyalty": false}'),
('Pro', 999, '{"ai_insights": true, "multi_store": true, "helpdesk": true, "loyalty": true, "max_stores": 3}'),
('Enterprise', 4999, '{"ai_insights": true, "multi_store": true, "helpdesk": true, "loyalty": true, "max_stores": 100, "white_label": true}');
