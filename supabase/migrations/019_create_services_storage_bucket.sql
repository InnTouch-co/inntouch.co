-- Create storage bucket for service photos and menu item photos
-- Note: This requires Supabase Storage to be enabled
-- Run this migration after setting up Supabase Storage

-- Create the services bucket (if it doesn't exist)
-- This is a placeholder - actual bucket creation should be done via Supabase Dashboard or Storage API
-- Bucket name: 'services'
-- Public: true (so photos can be accessed via public URLs)
-- File size limit: 5MB
-- Allowed MIME types: image/jpeg, image/png, image/webp

-- Storage policies will be created via Supabase Dashboard or RLS policies
-- For now, you need to:
-- 1. Go to Supabase Dashboard > Storage
-- 2. Create a new bucket named 'services'
-- 3. Set it to public
-- 4. Configure policies to allow authenticated users to upload/read

-- Example policy (to be created in Supabase Dashboard):
-- Policy name: "Allow authenticated users to upload service photos"
-- Policy: 
--   INSERT: auth.role() = 'authenticated'
--   SELECT: true (public bucket)
--   UPDATE: auth.role() = 'authenticated'
--   DELETE: auth.role() = 'authenticated'



