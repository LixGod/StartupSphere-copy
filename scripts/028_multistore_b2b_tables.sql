-- ==========================================================
-- Phase 4: Multi-Store & B2B Wholesale
-- ==========================================================

-- 1. Business Locations (Stores/Warehouses)
CREATE TABLE IF NOT EXISTS public.locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- retail, warehouse, hybrid
    address TEXT,
    phone TEXT,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Location-wise Inventory (Stock per location)
CREATE TABLE IF NOT EXISTS public.location_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    stock_quantity INTEGER DEFAULT 0,
    min_stock_level INTEGER DEFAULT 5,
    last_restock_date TIMESTAMPTZ,
    UNIQUE(location_id, product_id)
);

-- 3. Wholesale Tiers (For B2B pricing)
CREATE TABLE IF NOT EXISTS public.wholesale_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- Gold, Silver, Platinum, Bulk
    discount_percentage NUMERIC(5, 2) DEFAULT 0.00,
    min_order_value NUMERIC(15, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link contacts/companies to wholesale tiers
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS wholesale_tier_id UUID REFERENCES public.wholesale_tiers(id) ON DELETE SET NULL;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS wholesale_tier_id UUID REFERENCES public.wholesale_tiers(id) ON DELETE SET NULL;

-- 4. B2B Client Portals (Settings for client access)
CREATE TABLE IF NOT EXISTS public.client_portals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    subdomain TEXT UNIQUE, -- e.g. clientname.startupsphere.com
    is_active BOOLEAN DEFAULT true,
    theme_config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Bulk Orders (B2B specific orders)
CREATE TABLE IF NOT EXISTS public.bulk_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    location_id UUID REFERENCES public.locations(id),
    status TEXT DEFAULT 'draft', -- draft, pending_approval, processing, shipped, delivered, cancelled
    total_amount NUMERIC(15, 2) NOT NULL,
    tax_amount NUMERIC(15, 2) DEFAULT 0.00,
    discount_amount NUMERIC(15, 2) DEFAULT 0.00,
    payment_status TEXT DEFAULT 'pending', -- pending, partial, paid
    notes TEXT,
    expected_delivery_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Bulk Order Items
CREATE TABLE IF NOT EXISTS public.bulk_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bulk_order_id UUID REFERENCES public.bulk_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(15, 2) NOT NULL,
    total_price NUMERIC(15, 2) NOT NULL
);

-- RLS POLICIES --

-- Locations
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Locations viewable by company" ON public.locations
    FOR SELECT USING (auth.uid() IN (SELECT id FROM public.profiles WHERE owner_id = locations.owner_id OR id = locations.owner_id));
CREATE POLICY "Locations manageable by company" ON public.locations
    FOR ALL USING (auth.uid() IN (SELECT id FROM public.profiles WHERE owner_id = locations.owner_id OR id = locations.owner_id));

-- Inventory
ALTER TABLE public.location_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Inventory viewable by company" ON public.location_inventory
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.locations l WHERE l.id = location_inventory.location_id AND (l.owner_id = (SELECT owner_id FROM public.profiles WHERE id = auth.uid()) OR l.owner_id = auth.uid())));

-- Wholesale Tiers
ALTER TABLE public.wholesale_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tiers viewable by company" ON public.wholesale_tiers
    FOR SELECT USING (auth.uid() IN (SELECT id FROM public.profiles WHERE owner_id = wholesale_tiers.owner_id OR id = wholesale_tiers.owner_id));

-- Bulk Orders
ALTER TABLE public.bulk_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Orders viewable by company" ON public.bulk_orders
    FOR SELECT USING (auth.uid() IN (SELECT id FROM public.profiles WHERE owner_id = bulk_orders.owner_id OR id = bulk_orders.owner_id));
CREATE POLICY "Orders manageable by company" ON public.bulk_orders
    FOR ALL USING (auth.uid() IN (SELECT id FROM public.profiles WHERE owner_id = bulk_orders.owner_id OR id = bulk_orders.owner_id));
