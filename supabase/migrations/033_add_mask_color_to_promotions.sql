-- Add mask_color column to promotions table if it doesn't exist
-- This migration adds the mask_color column for image overlay configuration

ALTER TABLE promotions
ADD COLUMN IF NOT EXISTS mask_color TEXT DEFAULT 'rgba(0,0,0,0.5)';

-- Update existing promotions to have default mask color if null
UPDATE promotions
SET mask_color = 'rgba(0,0,0,0.5)'
WHERE mask_color IS NULL;

