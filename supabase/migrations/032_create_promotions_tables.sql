-- Create promotions table for special offers and discounts
-- Performance optimized with specific indexes and column selections

CREATE TABLE IF NOT EXISTS promotions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  
  -- Promotion Details
  title TEXT NOT NULL,
  description TEXT,
  short_description TEXT, -- For banner display
  image_url TEXT, -- Optional promotional image
  
  -- Display Settings
  banner_duration_seconds INTEGER DEFAULT 5 NOT NULL, -- Auto-close duration (default 5 seconds)
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  show_banner BOOLEAN DEFAULT TRUE NOT NULL, -- Whether to show popup banner
  show_always BOOLEAN DEFAULT FALSE NOT NULL, -- If true, ignore time/date restrictions and show always
  
  -- Time-based Rules
  start_date DATE,
  end_date DATE,
  start_time TIME, -- e.g., '14:00:00' for 2 PM
  end_time TIME, -- e.g., '17:00:00' for 5 PM
  days_of_week INTEGER[] DEFAULT ARRAY[0,1,2,3,4,5,6], -- 0=Sunday, 6=Saturday
  
  -- Discount Configuration
  discount_type TEXT NOT NULL DEFAULT 'percentage', -- 'percentage', 'fixed_amount', 'free_item'
  discount_value NUMERIC(20, 6) NOT NULL, -- Percentage (0-100) or fixed amount
  min_order_amount NUMERIC(20, 6) DEFAULT 0, -- Minimum order to qualify
  max_discount_amount NUMERIC(20, 6), -- Maximum discount cap (for percentage)
  
  -- Product/Service Targeting
  applies_to_all_products BOOLEAN DEFAULT FALSE NOT NULL,
  applies_to_service_types TEXT[], -- e.g., ['restaurant', 'bar']
  
  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP(0) DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP(0),
  is_deleted BOOLEAN DEFAULT FALSE NOT NULL
);

-- Create promotion_product_discounts table for product-specific discounts
CREATE TABLE IF NOT EXISTS promotion_product_discounts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  -- Override discount for this specific product
  discount_type TEXT NOT NULL DEFAULT 'percentage', -- 'percentage', 'fixed_amount'
  discount_value NUMERIC(20, 6) NOT NULL,
  max_discount_amount NUMERIC(20, 6),
  
  created_at TIMESTAMP(0) DEFAULT NOW() NOT NULL,
  is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
  
  UNIQUE(promotion_id, product_id)
);

-- Performance indexes
CREATE INDEX idx_promotions_hotel_id ON promotions(hotel_id);
CREATE INDEX idx_promotions_is_active ON promotions(is_active) WHERE is_active = TRUE AND is_deleted = FALSE;
CREATE INDEX idx_promotions_dates ON promotions(start_date, end_date) WHERE is_active = TRUE AND is_deleted = FALSE;
CREATE INDEX idx_promotions_show_banner ON promotions(show_banner, is_active) WHERE show_banner = TRUE AND is_active = TRUE AND is_deleted = FALSE;
CREATE INDEX idx_promotion_product_discounts_promotion_id ON promotion_product_discounts(promotion_id);
CREATE INDEX idx_promotion_product_discounts_product_id ON promotion_product_discounts(product_id);

-- Composite index for active promotions query (most common query)
CREATE INDEX idx_promotions_active_lookup ON promotions(hotel_id, is_active, show_banner, is_deleted, start_date, end_date) 
WHERE is_active = TRUE AND show_banner = TRUE AND is_deleted = FALSE;

