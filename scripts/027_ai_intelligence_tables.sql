-- ==========================================================
-- Phase 3: AI Intelligence Suite
-- ==========================================================

-- 1. AI Insights Table (Stores generated insights and anomalies)
CREATE TABLE IF NOT EXISTS public.ai_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- anomaly, trend, recommendation, insight
    severity TEXT DEFAULT 'info', -- info, warning, critical
    category TEXT NOT NULL, -- sales, inventory, finance, crm
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    impact_value TEXT, -- e.g. "potential ₹50k loss" or "+15% growth"
    action_url TEXT, -- link to take action
    metadata JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Performance Forecasts Table
CREATE TABLE IF NOT EXISTS public.performance_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_date DATE NOT NULL,
    forecast_type TEXT NOT NULL, -- revenue, sales_count, expense
    predicted_value NUMERIC(15, 2) NOT NULL,
    lower_bound NUMERIC(15, 2), -- confidence interval
    upper_bound NUMERIC(15, 2),
    confidence_score INTEGER, -- 0-100
    model_version TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Inventory Demand Projections
CREATE TABLE IF NOT EXISTS public.demand_projections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    projected_out_of_stock_date DATE,
    recommended_restock_date DATE,
    recommended_quantity INTEGER,
    confidence_score INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Customer Churn Risk Analysis
CREATE TABLE IF NOT EXISTS public.churn_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
    risk_score INTEGER NOT NULL, -- 0-100
    risk_level TEXT, -- low, medium, high
    risk_factors TEXT[], -- e.g. ["no purchases in 30 days", "unresolved tickets"]
    last_analyzed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Business Health Snapshots (For historical trend analysis)
CREATE TABLE IF NOT EXISTS public.business_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    snapshot_date DATE DEFAULT CURRENT_DATE,
    metrics JSONB NOT NULL, -- { revenue: X, profit: Y, crm_leads: Z, etc. }
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Realtime for AI Insights
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_insights;

-- RLS POLICIES --

-- AI Insights
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "AI insights viewable by company" ON public.ai_insights
    FOR SELECT USING (auth.uid() IN (SELECT id FROM public.profiles WHERE owner_id = ai_insights.owner_id OR id = ai_insights.owner_id));
CREATE POLICY "AI insights manageable by company" ON public.ai_insights
    FOR ALL USING (auth.uid() IN (SELECT id FROM public.profiles WHERE owner_id = ai_insights.owner_id OR id = ai_insights.owner_id));

-- Forecasts
ALTER TABLE public.performance_forecasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Forecasts viewable by company" ON public.performance_forecasts
    FOR SELECT USING (auth.uid() IN (SELECT id FROM public.profiles WHERE owner_id = performance_forecasts.owner_id OR id = performance_forecasts.owner_id));

-- Demand Projections
ALTER TABLE public.demand_projections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Projections viewable by company" ON public.demand_projections
    FOR SELECT USING (auth.uid() IN (SELECT id FROM public.profiles WHERE owner_id = demand_projections.owner_id OR id = demand_projections.owner_id));

-- Churn Analysis
ALTER TABLE public.churn_analysis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Churn analysis viewable by company" ON public.churn_analysis
    FOR SELECT USING (auth.uid() IN (SELECT id FROM public.profiles WHERE owner_id = churn_analysis.owner_id OR id = churn_analysis.owner_id));

-- Snapshots
ALTER TABLE public.business_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Snapshots viewable by company" ON public.business_snapshots
    FOR SELECT USING (auth.uid() IN (SELECT id FROM public.profiles WHERE owner_id = business_snapshots.owner_id OR id = business_snapshots.owner_id));
