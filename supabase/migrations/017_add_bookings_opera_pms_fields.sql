-- Add OPERA PMS integration fields to bookings table
-- This allows storing OPERA-specific data for future integration

-- Add metadata JSONB field for flexible OPERA PMS data storage
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add specific OPERA PMS fields (optional, can also be stored in metadata)
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS opera_confirmation_number TEXT,
ADD COLUMN IF NOT EXISTS opera_folio_number TEXT,
ADD COLUMN IF NOT EXISTS opera_reservation_id TEXT;

-- Create index on metadata for faster queries
CREATE INDEX IF NOT EXISTS idx_bookings_metadata ON bookings USING GIN (metadata);

-- Create index on OPERA fields for faster lookups
CREATE INDEX IF NOT EXISTS idx_bookings_opera_confirmation ON bookings(opera_confirmation_number) WHERE opera_confirmation_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_opera_reservation ON bookings(opera_reservation_id) WHERE opera_reservation_id IS NOT NULL;

-- Add comment explaining the purpose
COMMENT ON COLUMN bookings.metadata IS 'Flexible JSONB field for storing OPERA PMS integration data and other external system metadata';
COMMENT ON COLUMN bookings.opera_confirmation_number IS 'OPERA PMS confirmation number';
COMMENT ON COLUMN bookings.opera_folio_number IS 'OPERA PMS folio number';
COMMENT ON COLUMN bookings.opera_reservation_id IS 'OPERA PMS reservation ID';



