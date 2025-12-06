-- Remove room pricing and detail fields for service-oriented system
-- This migration removes fields that are not needed when focusing on services only

-- Remove columns from rooms table
ALTER TABLE rooms 
DROP COLUMN IF EXISTS room_type,
DROP COLUMN IF EXISTS floor,
DROP COLUMN IF EXISTS bed_type,
DROP COLUMN IF EXISTS capacity,
DROP COLUMN IF EXISTS price_per_night,
DROP COLUMN IF EXISTS amenities;

-- Note: room_number, status, hotel_id, and other essential fields remain

