-- ==========================================================
-- Phase 1: Advanced CRM & Lead Management + Smart Alerts
-- ==========================================================

-- 1. Contacts Table
CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    company_id UUID, -- Will link to companies table below
    job_title TEXT,
    lead_source TEXT,
    lead_status TEXT DEFAULT 'new', -- new, contacted, qualified, lost, customer
    lead_score INTEGER DEFAULT 0,
    tags TEXT[],
    lifecycle_stage TEXT DEFAULT 'lead', -- lead, marketing_qualified, sales_qualified, opportunity, customer, evangelist
    last_contact_date TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Companies Table
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    industry TEXT,
    website TEXT,
    phone TEXT,
    address TEXT,
    size TEXT, -- small, medium, large, enterprise
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link contacts to companies
ALTER TABLE public.contacts 
ADD CONSTRAINT fk_contact_company 
FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL;

-- 3. Pipeline Stages Table
CREATE TABLE IF NOT EXISTS public.pipeline_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    probability INTEGER DEFAULT 0, -- probability of closing from this stage
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Deals Table
CREATE TABLE IF NOT EXISTS public.deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    stage_id UUID REFERENCES public.pipeline_stages(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    value NUMERIC(15, 2) DEFAULT 0.00,
    currency TEXT DEFAULT 'INR',
    expected_close_date DATE,
    actual_close_date DATE,
    priority TEXT DEFAULT 'medium', -- low, medium, high
    status TEXT DEFAULT 'open', -- open, won, lost
    loss_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Deal Activities Table (Timeline)
CREATE TABLE IF NOT EXISTS public.deal_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- call, email, meeting, note, stage_change, task
    title TEXT NOT NULL,
    description TEXT,
    activity_date TIMESTAMPTZ DEFAULT NOW(),
    performed_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Follow-up Tasks Table
CREATE TABLE IF NOT EXISTS public.follow_up_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ,
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'pending', -- pending, completed, overdue
    assigned_to UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Smart Alerts Table
CREATE TABLE IF NOT EXISTS public.smart_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- inventory_low, payment_overdue, churn_risk, anomaly, insight
    severity TEXT DEFAULT 'info', -- info, warning, critical
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    entity_type TEXT, -- product, invoice, contact, etc.
    entity_id UUID,
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS POLICIES --

-- Contacts
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Contacts are viewable by company staff" ON public.contacts
    FOR SELECT USING (auth.uid() IN (
        SELECT id FROM public.profiles WHERE owner_id = contacts.owner_id OR id = contacts.owner_id
    ));
CREATE POLICY "Contacts are manageable by company staff" ON public.contacts
    FOR ALL USING (auth.uid() IN (
        SELECT id FROM public.profiles WHERE owner_id = contacts.owner_id OR id = contacts.owner_id
    ));

-- Companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Companies are viewable by company staff" ON public.companies
    FOR SELECT USING (auth.uid() IN (
        SELECT id FROM public.profiles WHERE owner_id = companies.owner_id OR id = companies.owner_id
    ));
CREATE POLICY "Companies are manageable by company staff" ON public.companies
    FOR ALL USING (auth.uid() IN (
        SELECT id FROM public.profiles WHERE owner_id = companies.owner_id OR id = companies.owner_id
    ));

-- Pipeline Stages
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pipeline stages are viewable by company staff" ON public.pipeline_stages
    FOR SELECT USING (auth.uid() IN (
        SELECT id FROM public.profiles WHERE owner_id = pipeline_stages.owner_id OR id = pipeline_stages.owner_id
    ));
CREATE POLICY "Pipeline stages are manageable by company staff" ON public.pipeline_stages
    FOR ALL USING (auth.uid() IN (
        SELECT id FROM public.profiles WHERE owner_id = pipeline_stages.owner_id OR id = pipeline_stages.owner_id
    ));

-- Deals
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deals are viewable by company staff" ON public.deals
    FOR SELECT USING (auth.uid() IN (
        SELECT id FROM public.profiles WHERE owner_id = deals.owner_id OR id = deals.owner_id
    ));
CREATE POLICY "Deals are manageable by company staff" ON public.deals
    FOR ALL USING (auth.uid() IN (
        SELECT id FROM public.profiles WHERE owner_id = deals.owner_id OR id = deals.owner_id
    ));

-- Deal Activities
ALTER TABLE public.deal_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deal activities are viewable by company staff" ON public.deal_activities
    FOR SELECT USING (auth.uid() IN (
        SELECT id FROM public.profiles WHERE id IN (SELECT performed_by FROM public.deal_activities WHERE id = deal_activities.id)
        OR (SELECT owner_id FROM public.deals WHERE id = deal_activities.deal_id) = (SELECT owner_id FROM public.profiles WHERE id = auth.uid())
        OR (SELECT owner_id FROM public.deals WHERE id = deal_activities.deal_id) = auth.uid()
    ));

-- Follow-up Tasks
ALTER TABLE public.follow_up_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tasks are viewable by company staff" ON public.follow_up_tasks
    FOR SELECT USING (auth.uid() IN (
        SELECT id FROM public.profiles WHERE owner_id = follow_up_tasks.owner_id OR id = follow_up_tasks.owner_id
    ));
CREATE POLICY "Tasks are manageable by company staff" ON public.follow_up_tasks
    FOR ALL USING (auth.uid() IN (
        SELECT id FROM public.profiles WHERE owner_id = follow_up_tasks.owner_id OR id = follow_up_tasks.owner_id
    ));

-- Smart Alerts
ALTER TABLE public.smart_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Alerts are viewable by company staff" ON public.smart_alerts
    FOR SELECT USING (auth.uid() IN (
        SELECT id FROM public.profiles WHERE owner_id = smart_alerts.owner_id OR id = smart_alerts.owner_id
    ));
CREATE POLICY "Alerts are manageable by company staff" ON public.smart_alerts
    FOR ALL USING (auth.uid() IN (
        SELECT id FROM public.profiles WHERE owner_id = smart_alerts.owner_id OR id = smart_alerts.owner_id
    ));

-- DEFAULT DATA --

-- Initial Pipeline Stages
INSERT INTO public.pipeline_stages (name, order_index, probability, is_default) VALUES
('Lead', 0, 10, true),
('Contacted', 1, 20, true),
('Meeting Scheduled', 2, 40, true),
('Proposal Sent', 3, 60, true),
('Negotiation', 4, 80, true),
('Contract Sent', 5, 90, true);
-- Note: owner_id will be NULL for these system defaults, RLS should handle it or we set it per user on signup.
-- Ideally, we run a trigger or function to seed these for new owners.
