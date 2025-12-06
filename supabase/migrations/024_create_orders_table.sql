-- Create orders table for structured order management
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  service_request_id UUID REFERENCES service_requests(id) ON DELETE SET NULL,
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  
  -- Order Details
  order_number TEXT NOT NULL UNIQUE, -- e.g., "ORD-2024-001234"
  order_type TEXT NOT NULL, -- 'restaurant_order', 'bar_order', 'room_service_order'
  
  -- Guest Information
  guest_name TEXT NOT NULL,
  guest_email TEXT,
  guest_phone TEXT,
  room_number TEXT,
  
  -- Financial Information
  subtotal NUMERIC(20, 6) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(20, 6) NOT NULL DEFAULT 0,
  tip_amount NUMERIC(20, 6) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(20, 6) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(20, 6) NOT NULL DEFAULT 0,
  total_amount NUMERIC(20, 6) NOT NULL,
  
  -- Payment Information
  payment_status TEXT DEFAULT 'pending' NOT NULL, -- 'pending', 'processing', 'paid', 'failed', 'refunded'
  payment_method TEXT, -- 'card', 'cash', 'room_charge', 'stripe', 'paypal'
  payment_intent_id TEXT, -- For Stripe/PayPal
  payment_transaction_id TEXT,
  paid_at TIMESTAMP(0),
  
  -- Order Status
  status TEXT DEFAULT 'pending' NOT NULL, -- 'pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'
  estimated_delivery_time TIMESTAMP(0),
  delivered_at TIMESTAMP(0),
  
  -- Additional Information
  special_instructions TEXT,
  items JSONB NOT NULL, -- Store order items as JSON
  metadata JSONB, -- Additional flexible data
  
  -- Timestamps
  created_at TIMESTAMP(0) DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP(0),
  is_deleted BOOLEAN DEFAULT FALSE NOT NULL
);

-- Create order_items table for better normalization (optional but recommended)
CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id TEXT NOT NULL, -- Reference to menu item (can be UUID or name)
  menu_item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(20, 6) NOT NULL,
  total_price NUMERIC(20, 6) NOT NULL,
  special_instructions TEXT,
  created_at TIMESTAMP(0) DEFAULT NOW() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX idx_orders_hotel_id ON orders(hotel_id);
CREATE INDEX idx_orders_room_id ON orders(room_id);
CREATE INDEX idx_orders_booking_id ON orders(booking_id);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_room_number ON orders(room_number);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_menu_item_id ON order_items(menu_item_id);

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  sequence_num INTEGER;
  order_num TEXT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  
  -- Get the next sequence number for this year
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 9) AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM orders
  WHERE order_number LIKE 'ORD-' || year_part || '-%'
    AND is_deleted = FALSE;
  
  -- Format: ORD-YYYY-XXXXXX (6 digits)
  order_num := 'ORD-' || year_part || '-' || LPAD(sequence_num::TEXT, 6, '0');
  
  RETURN order_num;
END;
$$ LANGUAGE plpgsql;

