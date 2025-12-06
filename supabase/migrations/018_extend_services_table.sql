-- Extend services table for widget-based service management
-- Add fields for menu, photos, description, service_type, and other management features

ALTER TABLE services
ADD COLUMN IF NOT EXISTS service_type TEXT DEFAULT 'other', -- restaurant, bar, spa, gym, pool, laundry, concierge, room_service, additional, other
ADD COLUMN IF NOT EXISTS description JSONB,
ADD COLUMN IF NOT EXISTS menu JSONB, -- For restaurant/bar: menu items with prices
ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}', -- Array of photo URLs
ADD COLUMN IF NOT EXISTS operating_hours JSONB, -- Operating hours for the service
ADD COLUMN IF NOT EXISTS contact_info JSONB, -- Phone, email, extension for the service
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}', -- Additional settings specific to service type
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 100; -- Order for display in widgets

-- Create index for service_type and active status for faster filtering
CREATE INDEX IF NOT EXISTS idx_services_hotel_type_active ON services(hotel_id, service_type, active) WHERE is_deleted = false;

-- Create index for display_order
CREATE INDEX IF NOT EXISTS idx_services_display_order ON services(hotel_id, display_order) WHERE is_deleted = false;

-- Add comment to service_type column
COMMENT ON COLUMN services.service_type IS 'Type of service: restaurant, bar, spa, gym, pool, laundry, concierge, room_service, additional, other';



