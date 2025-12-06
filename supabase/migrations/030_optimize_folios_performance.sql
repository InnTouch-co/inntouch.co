-- Performance optimization for folios queries
-- Add composite indexes for common query patterns

-- Composite index for bookings: hotel + status + is_deleted + updated_at (for folio queries)
CREATE INDEX IF NOT EXISTS idx_bookings_hotel_status_deleted_updated 
ON bookings(hotel_id, status, is_deleted, updated_at DESC)
WHERE is_deleted = false AND status = 'checked_out';

-- Composite index for bookings: hotel + status + guest_name (for search)
CREATE INDEX IF NOT EXISTS idx_bookings_hotel_status_guest_name 
ON bookings(hotel_id, status, guest_name)
WHERE is_deleted = false AND status = 'checked_out';

-- Index for bookings: room_id (for room filtering)
CREATE INDEX IF NOT EXISTS idx_bookings_room_id 
ON bookings(room_id)
WHERE is_deleted = false AND room_id IS NOT NULL;

-- Composite index for folio_adjustments: booking_id + is_deleted + adjusted_at (for latest adjustment lookup)
CREATE INDEX IF NOT EXISTS idx_folio_adjustments_booking_deleted_adjusted 
ON folio_adjustments(booking_id, is_deleted, adjusted_at DESC)
WHERE is_deleted = false;

-- Analyze tables to update statistics
ANALYZE bookings;
ANALYZE folio_adjustments;
ANALYZE rooms;

