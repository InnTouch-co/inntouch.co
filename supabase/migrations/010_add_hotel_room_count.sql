-- Add room_count field to hotels table for quick reference
-- This can be manually set or synced from the actual rooms table count

alter table hotels 
add column if not exists room_count integer default 0;

-- Create index for room_count if needed for queries
create index if not exists idx_hotels_room_count on hotels(room_count);

