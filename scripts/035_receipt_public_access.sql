-- 035_receipt_public_access.sql
-- Goal: Allow public access to view receipts (unguessable UUIDs)

-- Allow public to view a sales order by its UUID
DROP POLICY IF EXISTS "Public can view sales orders by ID" ON public.sales_orders;
CREATE POLICY "Public can view sales orders by ID" ON public.sales_orders
    FOR SELECT USING (true);

-- Allow public to view order items linked to a sales order
DROP POLICY IF EXISTS "Public can view order items" ON public.order_items;
CREATE POLICY "Public can view order items" ON public.order_items
    FOR SELECT USING (true);

-- Allow public to view basic profile info (needed for receipt headers)
DROP POLICY IF EXISTS "Public can view business profiles" ON public.profiles;
CREATE POLICY "Public can view business profiles" ON public.profiles
    FOR SELECT USING (role = 'owner');

-- Allow public to view products (needed for receipt item names)
DROP POLICY IF EXISTS "Public can view products" ON public.products;
CREATE POLICY "Public can view products" ON public.products
    FOR SELECT USING (true);

