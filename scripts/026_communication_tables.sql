-- ==========================================================
-- Phase 2: Unified Communication Hub & Helpdesk
-- ==========================================================

-- 1. Conversations Table (Grouping messages)
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
    subject TEXT,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_preview TEXT,
    platform TEXT NOT NULL, -- whatsapp, email, in_app
    status TEXT DEFAULT 'active', -- active, archived
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.profiles(id), -- NULL if sent by customer
    sender_type TEXT NOT NULL, -- business, customer
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}', -- store technical details like whatsapp message id, email headers
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Message Templates Table
CREATE TABLE IF NOT EXISTS public.message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    content TEXT NOT NULL, -- e.g. "Hi {{customer_name}}, your invoice {{invoice_number}} is ready."
    category TEXT, -- marketing, support, billing
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Support Tickets Table
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'medium', -- low, medium, high, urgent
    status TEXT DEFAULT 'open', -- open, pending, resolved, closed
    assigned_to UUID REFERENCES public.profiles(id),
    due_at TIMESTAMPTZ,
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Ticket Comments (Internal or External)
CREATE TABLE IF NOT EXISTS public.ticket_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.profiles(id),
    content TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Knowledge Base Articles
CREATE TABLE IF NOT EXISTS public.knowledge_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT,
    is_published BOOLEAN DEFAULT false,
    slug TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Realtime for critical communication tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;

-- RLS POLICIES --

-- Conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Conversations viewable by company" ON public.conversations
    FOR SELECT USING (auth.uid() IN (SELECT id FROM public.profiles WHERE owner_id = conversations.owner_id OR id = conversations.owner_id));
CREATE POLICY "Conversations manageable by company" ON public.conversations
    FOR ALL USING (auth.uid() IN (SELECT id FROM public.profiles WHERE owner_id = conversations.owner_id OR id = conversations.owner_id));

-- Messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Messages viewable by company" ON public.messages
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.conversations c 
        WHERE c.id = messages.conversation_id 
        AND (c.owner_id = (SELECT owner_id FROM public.profiles WHERE id = auth.uid()) OR c.owner_id = auth.uid())
    ));
CREATE POLICY "Messages manageable by company" ON public.messages
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.conversations c 
        WHERE c.id = messages.conversation_id 
        AND (c.owner_id = (SELECT owner_id FROM public.profiles WHERE id = auth.uid()) OR c.owner_id = auth.uid())
    ));

-- Templates
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Templates viewable by company" ON public.message_templates
    FOR SELECT USING (auth.uid() IN (SELECT id FROM public.profiles WHERE owner_id = message_templates.owner_id OR id = message_templates.owner_id));
CREATE POLICY "Templates manageable by company" ON public.message_templates
    FOR ALL USING (auth.uid() IN (SELECT id FROM public.profiles WHERE owner_id = message_templates.owner_id OR id = message_templates.owner_id));

-- Tickets
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tickets viewable by company" ON public.support_tickets
    FOR SELECT USING (auth.uid() IN (SELECT id FROM public.profiles WHERE owner_id = support_tickets.owner_id OR id = support_tickets.owner_id));
CREATE POLICY "Tickets manageable by company" ON public.support_tickets
    FOR ALL USING (auth.uid() IN (SELECT id FROM public.profiles WHERE owner_id = support_tickets.owner_id OR id = support_tickets.owner_id));

-- Ticket Comments
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments viewable by company" ON public.ticket_comments
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.support_tickets t 
        WHERE t.id = ticket_comments.ticket_id 
        AND (t.owner_id = (SELECT owner_id FROM public.profiles WHERE id = auth.uid()) OR t.owner_id = auth.uid())
    ));

-- Knowledge Articles
ALTER TABLE public.knowledge_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Articles viewable by company" ON public.knowledge_articles
    FOR SELECT USING (auth.uid() IN (SELECT id FROM public.profiles WHERE owner_id = knowledge_articles.owner_id OR id = knowledge_articles.owner_id));
CREATE POLICY "Articles manageable by company" ON public.knowledge_articles
    FOR ALL USING (auth.uid() IN (SELECT id FROM public.profiles WHERE owner_id = knowledge_articles.owner_id OR id = knowledge_articles.owner_id));
