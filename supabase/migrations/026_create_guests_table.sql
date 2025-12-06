-- Create guests table for centralized guest management
-- This allows tracking guest history, preferences, and repeat visits

CREATE TABLE IF NOT EXISTS guests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  
  -- Guest Information
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  
  -- Additional Information (for future use)
  preferences JSONB DEFAULT '{}', -- e.g., {"dietary_restrictions": [], "favorite_items": []}
  notes TEXT, -- Staff notes about guest
  loyalty_points INTEGER DEFAULT 0, -- For future loyalty program
  
  -- Metadata
  first_visit_date DATE,
  last_visit_date DATE,
  total_visits INTEGER DEFAULT 0,
  total_spent NUMERIC(20, 6) DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP(0) DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP(0),
  is_deleted BOOLEAN DEFAULT FALSE NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX idx_guests_hotel_id ON guests(hotel_id);
CREATE INDEX idx_guests_email ON guests(email) WHERE email IS NOT NULL;
CREATE INDEX idx_guests_phone ON guests(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_guests_name ON guests(name);
CREATE INDEX idx_guests_is_deleted ON guests(is_deleted);

-- Create partial unique index: same email per hotel (only for non-deleted guests with email)
CREATE UNIQUE INDEX IF NOT EXISTS idx_guests_unique_email_per_hotel 
ON guests(hotel_id, email) 
WHERE email IS NOT NULL AND is_deleted = FALSE;

-- Add guest_id to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS guest_id UUID REFERENCES guests(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_guest_id ON bookings(guest_id);

-- Add guest_id to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS guest_id UUID REFERENCES guests(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_guest_id ON orders(guest_id);

-- Add guest_id to service_requests table
ALTER TABLE service_requests 
ADD COLUMN IF NOT EXISTS guest_id UUID REFERENCES guests(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_service_requests_guest_id ON service_requests(guest_id);

-- Function to find or create guest
CREATE OR REPLACE FUNCTION find_or_create_guest(
  p_hotel_id UUID,
  p_name TEXT,
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_guest_id UUID;
BEGIN
  -- Try to find existing guest by email (if provided)
  IF p_email IS NOT NULL THEN
    SELECT id INTO v_guest_id
    FROM guests
    WHERE hotel_id = p_hotel_id
      AND email = p_email
      AND is_deleted = FALSE
    LIMIT 1;
  END IF;
  
  -- If not found by email, try by phone (if provided)
  IF v_guest_id IS NULL AND p_phone IS NOT NULL THEN
    SELECT id INTO v_guest_id
    FROM guests
    WHERE hotel_id = p_hotel_id
      AND phone = p_phone
      AND is_deleted = FALSE
    LIMIT 1;
  END IF;
  
  -- If still not found, create new guest
  IF v_guest_id IS NULL THEN
    INSERT INTO guests (hotel_id, name, email, phone, first_visit_date, last_visit_date, total_visits)
    VALUES (p_hotel_id, p_name, p_email, p_phone, CURRENT_DATE, CURRENT_DATE, 1)
    RETURNING id INTO v_guest_id;
  ELSE
    -- Update existing guest
    UPDATE guests
    SET 
      name = COALESCE(p_name, name),
      email = COALESCE(p_email, email),
      phone = COALESCE(p_phone, phone),
      last_visit_date = CURRENT_DATE,
      total_visits = total_visits + 1,
      updated_at = NOW()
    WHERE id = v_guest_id;
  END IF;
  
  RETURN v_guest_id;
END;
$$ LANGUAGE plpgsql;

