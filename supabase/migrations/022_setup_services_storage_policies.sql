-- Setup storage bucket and policies for services photos
-- This migration creates the bucket (if it doesn't exist) and sets up RLS policies

-- Create the services bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'services',
  'services',
  true, -- Public bucket so photos can be accessed via public URLs
  5242880, -- 5MB file size limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET 
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

-- Drop existing policies if they exist (to avoid conflicts)
-- Note: Policy names are case-sensitive
DROP POLICY IF EXISTS "Allow authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload to services" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read from services" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update services files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete services files" ON storage.objects;
DROP POLICY IF EXISTS "allow_authenticated_upload" ON storage.objects;
DROP POLICY IF EXISTS "allow_public_read_access" ON storage.objects;
DROP POLICY IF EXISTS "allow_authenticated_update" ON storage.objects;
DROP POLICY IF EXISTS "allow_authenticated_delete" ON storage.objects;

-- Policy 1: Allow authenticated users to INSERT (upload) files to the services bucket
CREATE POLICY "Allow authenticated users to upload to services"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'services'
);

-- Policy 2: Allow public SELECT (read) access to the services bucket
CREATE POLICY "Allow public read from services"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'services'
);

-- Policy 3: Allow authenticated users to UPDATE files in the services bucket
CREATE POLICY "Allow authenticated users to update services files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'services'
)
WITH CHECK (
  bucket_id = 'services'
);

-- Policy 4: Allow authenticated users to DELETE files from the services bucket
CREATE POLICY "Allow authenticated users to delete services files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'services'
);

-- Verify the bucket exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'services'
  ) THEN
    RAISE EXCEPTION 'Bucket "services" was not created. Please create it manually in Supabase Dashboard > Storage.';
  END IF;
END $$;

-- Add comment
COMMENT ON POLICY "Allow authenticated users to upload to services" ON storage.objects IS 
  'Allows authenticated users to upload photos to the services bucket';
COMMENT ON POLICY "Allow public read from services" ON storage.objects IS 
  'Allows public read access to photos in the services bucket';
COMMENT ON POLICY "Allow authenticated users to update services files" ON storage.objects IS 
  'Allows authenticated users to update photos in the services bucket';
COMMENT ON POLICY "Allow authenticated users to delete services files" ON storage.objects IS 
  'Allows authenticated users to delete photos from the services bucket';

