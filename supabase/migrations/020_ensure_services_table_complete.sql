-- Ensure services table has all required fields for service management
-- This migration ensures all fields exist even if previous migrations were partially applied

-- Add service_type if it doesn't exist
ALTER TABLE services
ADD COLUMN IF NOT EXISTS service_type TEXT DEFAULT 'other';

-- Add description if it doesn't exist
ALTER TABLE services
ADD COLUMN IF NOT EXISTS description JSONB;

-- Add menu if it doesn't exist
ALTER TABLE services
ADD COLUMN IF NOT EXISTS menu JSONB;

-- Add photos if it doesn't exist
ALTER TABLE services
ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}';

-- Add operating_hours if it doesn't exist
ALTER TABLE services
ADD COLUMN IF NOT EXISTS operating_hours JSONB;

-- Add contact_info if it doesn't exist
ALTER TABLE services
ADD COLUMN IF NOT EXISTS contact_info JSONB;

-- Add settings if it doesn't exist
ALTER TABLE services
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

-- Add display_order if it doesn't exist
ALTER TABLE services
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 100;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_services_hotel_type_active 
ON services(hotel_id, service_type, active) 
WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_services_display_order 
ON services(hotel_id, display_order) 
WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_services_service_type 
ON services(service_type) 
WHERE is_deleted = false;

-- Add comments for documentation
COMMENT ON COLUMN services.service_type IS 'Type of service: restaurant, bar, spa, gym, pool, laundry, concierge, room_service, additional, other';
COMMENT ON COLUMN services.description IS 'Service description in JSON format';
COMMENT ON COLUMN services.menu IS 'Menu items for restaurant/bar services in JSON format';
COMMENT ON COLUMN services.photos IS 'Array of photo URLs for the service';
COMMENT ON COLUMN services.operating_hours IS 'Operating hours for each day of the week in JSON format';
COMMENT ON COLUMN services.contact_info IS 'Contact information (phone, email, extension) in JSON format';
COMMENT ON COLUMN services.settings IS 'Service-specific settings in JSON format';
COMMENT ON COLUMN services.display_order IS 'Order for displaying services in the management interface';



