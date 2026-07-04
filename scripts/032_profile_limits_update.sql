-- Add max_locations to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS max_locations INTEGER DEFAULT 1;

-- Update existing profiles to have at least 1 location limit
UPDATE profiles SET max_locations = 1 WHERE max_locations IS NULL;
