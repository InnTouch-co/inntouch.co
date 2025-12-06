-- Add department column to order_items table for explicit kitchen/bar differentiation
-- This replaces complex keyword matching and service lookup logic with direct database filtering

ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS department TEXT 
CHECK (department IN ('kitchen', 'bar'));

-- Add index for efficient department filtering
CREATE INDEX IF NOT EXISTS idx_order_items_department 
ON order_items(order_id, department) 
WHERE department IN ('kitchen', 'bar');

-- Add comment
COMMENT ON COLUMN order_items.department IS 'Department responsible for this item: kitchen (restaurant/room service) or bar (drinks). Determined from service type when order is created.';

-- Note: Existing items will have NULL department
-- These will be handled in API code with fallback logic (current keyword matching)
-- New orders will always have department set correctly based on service type

