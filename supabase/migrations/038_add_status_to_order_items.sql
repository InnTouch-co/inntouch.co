-- Add status column to order_items table for item-level status tracking
-- This allows kitchen and bar staff to update status independently

ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' NOT NULL
CHECK (status IN ('pending', 'preparing', 'ready', 'delivered', 'cancelled'));

-- Add updated_at column for tracking when items are updated
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP(0);

-- Add index for efficient status queries
CREATE INDEX IF NOT EXISTS idx_order_items_status 
ON order_items(order_id, status)
WHERE status IN ('pending', 'preparing', 'ready');

-- Add index for department-specific queries (will be used with service_id lookup)
CREATE INDEX IF NOT EXISTS idx_order_items_order_status 
ON order_items(order_id, status, created_at);

-- Add comment
COMMENT ON COLUMN order_items.status IS 'Item-level status: pending, preparing, ready, delivered, cancelled. Allows kitchen and bar to track status independently.';
COMMENT ON COLUMN order_items.updated_at IS 'Timestamp when the item status was last updated.';

