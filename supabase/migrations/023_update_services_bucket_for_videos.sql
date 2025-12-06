-- Update services bucket to allow video files
-- This migration updates the services bucket to allow video MIME types and increases file size limit for videos

-- Update the services bucket to allow video files
UPDATE storage.buckets
SET 
  file_size_limit = 104857600, -- 100MB limit (increased from 5MB for videos)
  allowed_mime_types = ARRAY[
    'image/jpeg', 
    'image/jpg', 
    'image/png', 
    'image/webp', 
    'image/gif',
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/webm',
    'video/x-msvideo',
    'video/x-ms-wmv'
  ]
WHERE id = 'services';

-- Verify the update
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'services' AND 'video/mp4' = ANY(allowed_mime_types)
  ) THEN
    RAISE EXCEPTION 'Failed to update services bucket to allow video files.';
  END IF;
END $$;

