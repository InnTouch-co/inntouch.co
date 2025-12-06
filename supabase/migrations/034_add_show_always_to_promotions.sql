-- Add show_always column to promotions table
-- This allows promotions to ignore time/date restrictions and show always

ALTER TABLE promotions
ADD COLUMN IF NOT EXISTS show_always BOOLEAN DEFAULT FALSE NOT NULL;

-- Update existing promotions to have default value
UPDATE promotions
SET show_always = FALSE
WHERE show_always IS NULL;

