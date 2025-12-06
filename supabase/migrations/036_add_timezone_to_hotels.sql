-- Add timezone column to hotels table
-- Default timezone is America/Chicago (Central Time)

ALTER TABLE hotels 
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Chicago' NOT NULL;

-- Create index for timezone queries (if needed in future)
CREATE INDEX IF NOT EXISTS idx_hotels_timezone ON hotels(timezone);

-- Add comment to column
COMMENT ON COLUMN hotels.timezone IS 'IANA timezone identifier (e.g., America/Chicago, America/New_York, Europe/London). Default: America/Chicago';


