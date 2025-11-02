-- Add address, phone, and active status to hotels table

alter table hotels 
add column if not exists address text,
add column if not exists phone text,
add column if not exists active boolean default true not null;

-- Create index for active status
create index if not exists idx_hotels_active on hotels(active);

