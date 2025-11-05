-- Performance optimization indexes
-- This migration adds composite indexes for common query patterns

-- Composite index for service_requests: hotel + status (most common filter combination)
CREATE INDEX IF NOT EXISTS idx_service_requests_hotel_status 
ON service_requests(hotel_id, status, created_at DESC)
WHERE is_deleted = false;

-- Composite index for service_requests: hotel + request_type + status
CREATE INDEX IF NOT EXISTS idx_service_requests_hotel_type_status 
ON service_requests(hotel_id, request_type, status)
WHERE is_deleted = false;

-- Composite index for hotel_users: hotel + user + deleted (for permission checks)
CREATE INDEX IF NOT EXISTS idx_hotel_users_hotel_user_deleted 
ON hotel_users(hotel_id, user_id, is_deleted)
WHERE is_deleted = false;

-- Index for rooms: hotel + status (for filtering by status)
CREATE INDEX IF NOT EXISTS idx_rooms_hotel_status 
ON rooms(hotel_id, status)
WHERE is_deleted = false;

-- Index for users: role + deleted (for staff queries)
CREATE INDEX IF NOT EXISTS idx_users_role_deleted 
ON users(role_id, is_deleted)
WHERE is_deleted = false;

-- Partial index for active hotels only
CREATE INDEX IF NOT EXISTS idx_hotels_active 
ON hotels(id, active)
WHERE active = true;

-- Note: For text search optimization, consider adding pg_trgm extension in a future migration
-- Basic B-tree indexes don't help much with ILIKE queries, but composite indexes above will help

-- Verify indexes were created
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('service_requests', 'hotel_users', 'rooms', 'users', 'hotels')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

