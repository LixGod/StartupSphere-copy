-- ==========================================================
-- Add Customer Feedback table for AI Analysis
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.customer_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    source TEXT, -- email, survey, whatsapp, etc.
    sentiment TEXT, -- positive, neutral, negative
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS POLICIES --
ALTER TABLE public.customer_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Feedback viewable by company" ON public.customer_feedback
    FOR SELECT USING (auth.uid() IN (SELECT id FROM public.profiles WHERE owner_id = customer_feedback.owner_id OR id = customer_feedback.owner_id));
CREATE POLICY "Feedback manageable by company" ON public.customer_feedback
    FOR ALL USING (auth.uid() IN (SELECT id FROM public.profiles WHERE owner_id = customer_feedback.owner_id OR id = customer_feedback.owner_id));
