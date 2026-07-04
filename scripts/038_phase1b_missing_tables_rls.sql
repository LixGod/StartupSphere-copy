-- Run this in Supabase SQL editor to apply missing RLS policies (Phase 1)

-- deal_activities
ALTER TABLE deal_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all_deal_activities" ON deal_activities
FOR ALL USING (
  auth.uid() IN (
    SELECT owner_id FROM deals WHERE id = deal_activities.deal_id
  )
);

-- exchange_rates  
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- Exchange rates may be global/shared data, not user-specific
-- Apply read-only public policy:
CREATE POLICY "public_read_exchange_rates" ON exchange_rates
FOR SELECT USING (true);

-- Only allow service role to insert/update exchange rates
-- (no insert/update policy = only service role can modify)

-- approved_owners
ALTER TABLE approved_owners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_only_approved_owners" ON approved_owners
FOR ALL USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  )
);

CREATE POLICY "owner_read_own_approval" ON approved_owners
FOR SELECT USING (auth.uid() = owner_id);
