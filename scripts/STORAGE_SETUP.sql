-- ============================================
-- STORAGE SETUP: Receipts Bucket
-- Run this in the Supabase SQL Editor
-- ============================================

-- 1. Create the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS is managed by Supabase for storage.objects by default.
-- We just need to define the policies for our bucket.

-- 3. Policy: Public can view receipts (since bucket is public)
DROP POLICY IF EXISTS "Public View Receipts" ON storage.objects;
CREATE POLICY "Public View Receipts"
ON storage.objects FOR SELECT
USING (bucket_id = 'receipts');

-- 4. Policy: Authenticated users can upload receipts
DROP POLICY IF EXISTS "Authenticated Upload Receipts" ON storage.objects;
CREATE POLICY "Authenticated Upload Receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'receipts');

-- 5. Policy: Users can delete their own receipts
-- (Files are organized by owner_id in the path: owner_id/filename)
DROP POLICY IF EXISTS "Users can delete own receipts" ON storage.objects;
CREATE POLICY "Users can delete own receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);
