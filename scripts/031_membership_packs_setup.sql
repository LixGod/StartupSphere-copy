-- Membership Packs & Requests Setup

-- Add pack flags to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_sales_pack BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_multi_tenancy_pack BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_core_modules_pack BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_ai_analysis_pack BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_crm_pack BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS max_employees INTEGER DEFAULT 2;

-- Create membership_requests table
CREATE TABLE IF NOT EXISTS membership_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    requested_packs TEXT[] NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE membership_requests ENABLE ROW LEVEL SECURITY;

-- Policies for membership_requests
CREATE POLICY "Owners can view their own requests"
    ON membership_requests FOR SELECT
    USING (auth.uid() = owner_id);

CREATE POLICY "Owners can create their own requests"
    ON membership_requests FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Admins can manage all requests"
    ON membership_requests FOR ALL
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = TRUE));
