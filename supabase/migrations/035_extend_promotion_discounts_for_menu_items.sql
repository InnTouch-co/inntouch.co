-- Extend promotion_product_discounts table to support menu items
-- This allows promotions to target specific menu items (e.g., "Coffee") in addition to database products
-- Performance optimized with composite indexes for fast lookups

-- Add new columns for menu item support
ALTER TABLE promotion_product_discounts 
ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES services(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS menu_item_name TEXT,
ADD COLUMN IF NOT EXISTS item_type TEXT DEFAULT 'product' CHECK (item_type IN ('product', 'menu_item'));

-- Make product_id nullable (since menu items don't have product_id)
ALTER TABLE promotion_product_discounts 
ALTER COLUMN product_id DROP NOT NULL;

-- Update UNIQUE constraint to allow menu items
-- For products: (promotion_id, product_id) must be unique
-- For menu items: (promotion_id, service_id, menu_item_name) must be unique
-- Drop old constraint
ALTER TABLE promotion_product_discounts 
DROP CONSTRAINT IF EXISTS promotion_product_discounts_promotion_id_product_id_key;

-- Add new unique constraint that handles both cases
-- Note: PostgreSQL allows NULL values in unique constraints (NULL != NULL)
-- So we can have multiple NULL product_ids as long as service_id + menu_item_name differ
CREATE UNIQUE INDEX IF NOT EXISTS idx_promotion_discounts_product_unique 
ON promotion_product_discounts(promotion_id, product_id) 
WHERE product_id IS NOT NULL AND is_deleted = FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_promotion_discounts_menu_item_unique 
ON promotion_product_discounts(promotion_id, service_id, menu_item_name) 
WHERE service_id IS NOT NULL AND menu_item_name IS NOT NULL AND is_deleted = FALSE;

-- Performance indexes for fast lookups
-- Index for product lookups (existing, but ensure it's optimized)
CREATE INDEX IF NOT EXISTS idx_promotion_discounts_product_lookup 
ON promotion_product_discounts(promotion_id, product_id) 
WHERE product_id IS NOT NULL AND is_deleted = FALSE;

-- Index for menu item lookups (new)
CREATE INDEX IF NOT EXISTS idx_promotion_discounts_menu_item_lookup 
ON promotion_product_discounts(promotion_id, service_id, menu_item_name) 
WHERE service_id IS NOT NULL AND menu_item_name IS NOT NULL AND is_deleted = FALSE;

-- Composite index for general promotion lookups
CREATE INDEX IF NOT EXISTS idx_promotion_discounts_promotion_lookup 
ON promotion_product_discounts(promotion_id, is_deleted) 
WHERE is_deleted = FALSE;

-- Add comment for documentation
COMMENT ON COLUMN promotion_product_discounts.service_id IS 'Service ID for menu item discounts (null for product discounts)';
COMMENT ON COLUMN promotion_product_discounts.menu_item_name IS 'Menu item name for menu item discounts (normalized, lowercase). Null for product discounts.';
COMMENT ON COLUMN promotion_product_discounts.item_type IS 'Type of item: product (database product) or menu_item (service menu item)';


