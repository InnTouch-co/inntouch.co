-- Performance optimization for orders queries
-- Add composite indexes for common query patterns

-- Composite index for orders: hotel + status + is_deleted (most common filter)
CREATE INDEX IF NOT EXISTS idx_orders_hotel_status_deleted 
ON orders(hotel_id, status, is_deleted, created_at DESC)
WHERE is_deleted = false;

-- Composite index for orders: hotel + room_number + status (for room-specific queries)
CREATE INDEX IF NOT EXISTS idx_orders_hotel_room_status 
ON orders(hotel_id, room_number, status, created_at DESC)
WHERE is_deleted = false AND room_number IS NOT NULL;

-- Composite index for orders: hotel + payment_status + status (for folio queries)
CREATE INDEX IF NOT EXISTS idx_orders_hotel_payment_status 
ON orders(hotel_id, payment_status, status, created_at DESC)
WHERE is_deleted = false;

-- Composite index for orders: booking_id + payment_status (for folio queries)
CREATE INDEX IF NOT EXISTS idx_orders_booking_payment 
ON orders(booking_id, payment_status, created_at DESC)
WHERE booking_id IS NOT NULL AND is_deleted = false;

-- Index for order_items: order_id + created_at (for efficient item retrieval)
CREATE INDEX IF NOT EXISTS idx_order_items_order_created 
ON order_items(order_id, created_at);

-- Partial index for active orders only (pending, confirmed, preparing, ready, out_for_delivery)
CREATE INDEX IF NOT EXISTS idx_orders_active_status 
ON orders(hotel_id, created_at DESC)
WHERE is_deleted = false 
  AND status IN ('pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery');

-- Partial index for completed orders only (delivered)
CREATE INDEX IF NOT EXISTS idx_orders_completed_status 
ON orders(hotel_id, created_at DESC)
WHERE is_deleted = false AND status = 'delivered';

-- Analyze tables to update statistics
ANALYZE orders;
ANALYZE order_items;

