-- Create service_requests table for guest service requests
create table if not exists service_requests (
  id uuid default uuid_generate_v4() primary key,
  hotel_id uuid not null references hotels(id) on delete cascade,
  room_id uuid references rooms(id) on delete set null,
  booking_id uuid references bookings(id) on delete set null,
  title text not null,
  description text,
  request_type text not null, -- food, housekeeping, maintenance, concierge, other
  priority text default 'medium' not null, -- low, medium, high, urgent
  status text default 'pending' not null, -- pending, in_progress, completed, cancelled
  guest_name text,
  guest_email text,
  guest_phone text,
  assigned_to uuid references users(id) on delete set null,
  completed_at timestamp(0),
  response_time_minutes integer, -- time from creation to first response
  created_by uuid references users(id), -- null if created by guest
  created_at timestamp(0) default now() not null,
  updated_at timestamp(0),
  is_deleted boolean default false not null
);

-- Create indexes for better query performance
create index idx_service_requests_hotel_id on service_requests(hotel_id);
create index idx_service_requests_room_id on service_requests(room_id);
create index idx_service_requests_status on service_requests(status);
create index idx_service_requests_assigned_to on service_requests(assigned_to);
create index idx_service_requests_created_at on service_requests(created_at);

