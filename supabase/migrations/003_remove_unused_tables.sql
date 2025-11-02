-- Remove unused tables: inventory, content, notifications
-- These features have been completely removed from the application

-- Drop indexes first (they reference the tables)
drop index if exists idx_inventory_hotel_id;
drop index if exists idx_inventory_category;
drop index if exists idx_inventory_transactions_inventory_id;
drop index if exists idx_notifications_hotel_id;
drop index if exists idx_notifications_type;
drop index if exists idx_content_hotel_id;
drop index if exists idx_content_type;
drop index if exists idx_content_versions_content_id;

-- Drop tables (in reverse dependency order)
drop table if exists content_versions cascade;
drop table if exists inventory_transactions cascade;
drop table if exists inventory cascade;
drop table if exists notifications cascade;
drop table if exists content cascade;

-- Note: rooms and bookings tables are kept as they will be used by organization admins

