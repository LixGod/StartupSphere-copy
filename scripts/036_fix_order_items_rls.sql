-- Fix RLS for order_items table

-- Drop existing policies if any
DROP POLICY IF EXISTS "order_items_access" ON public.order_items;
DROP POLICY IF EXISTS "order_items_modify" ON public.order_items;

-- Select Policy
CREATE POLICY "order_items_access" ON public.order_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.sales_orders s 
    WHERE s.id = order_items.order_id AND (
      s.owner_id = auth.uid() 
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.owner_id = s.owner_id)
    )
  )
);

-- Insert/Update/Delete Policy
CREATE POLICY "order_items_modify" ON public.order_items FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.sales_orders s 
    WHERE s.id = order_items.order_id AND (
      s.owner_id = auth.uid() 
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.owner_id = s.owner_id)
    )
  )
);
