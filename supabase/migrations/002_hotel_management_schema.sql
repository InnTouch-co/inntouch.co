-- Extended schema for comprehensive hotel management system

-- Create user roles/permissions table
create table if not exists roles (
  id text primary key,
  name text not null,
  description text,
  permissions jsonb default '{}',
  created_at timestamp(0) default now() not null
);

-- Insert default roles
insert into roles (id, name, description, permissions) values 
  ('super_admin', 'Super Admin', 'Full system access', '{"all": true}'),
  ('hotel_admin', 'Hotel Admin', 'Hotel-level administration', '{"hotel": true, "users": true, "rooms": true, "bookings": true}'),
  ('front_desk', 'Front Desk', 'Front desk operations', '{"bookings": true, "guests": true}'),
  ('housekeeping', 'Housekeeping', 'Room maintenance and cleaning', '{"rooms": true}'),
  ('maintenance', 'Maintenance', 'Maintenance operations', '{"rooms": true}'),
  ('staff', 'Staff', 'Basic staff access', '{"view": true}')
on conflict (id) do nothing;

-- Update user_types to reference roles
alter table users add column role_id text references roles(id);
update users set role_id = 'staff' where role_id is null;

-- Create rooms table
create table if not exists rooms (
  id uuid default uuid_generate_v4() primary key,
  hotel_id uuid not null references hotels(id) on delete cascade,
  room_number text not null,
  room_type jsonb not null,
  floor integer,
  capacity integer default 1 not null,
  status text default 'available' not null, -- available, occupied, maintenance, cleaning
  amenities jsonb default '[]'::jsonb,
  price_per_night numeric(20,6),
  images text[] default '{}',
  is_deleted boolean default false not null,
  created_at timestamp(0) default now() not null,
  updated_at timestamp(0),
  unique (hotel_id, room_number)
);

-- Create bookings table
create table if not exists bookings (
  id uuid default uuid_generate_v4() primary key,
  hotel_id uuid not null references hotels(id) on delete cascade,
  room_id uuid references rooms(id) on delete set null,
  guest_name text not null,
  guest_email text,
  guest_phone text,
  check_in_date date not null,
  check_out_date date not null,
  status text default 'pending' not null, -- pending, confirmed, checked_in, checked_out, cancelled
  total_amount numeric(20,6) not null,
  payment_status text default 'pending', -- pending, paid, refunded
  special_requests text,
  created_by uuid references users(id),
  created_at timestamp(0) default now() not null,
  updated_at timestamp(0),
  is_deleted boolean default false not null
);

-- Create inventory table
create table if not exists inventory (
  id uuid default uuid_generate_v4() primary key,
  hotel_id uuid not null references hotels(id) on delete cascade,
  name jsonb not null,
  category text, -- linens, toiletries, maintenance, food, other
  quantity integer default 0 not null,
  unit text default 'pcs', -- pcs, kg, l, boxes
  min_stock_level integer default 0,
  supplier text,
  cost_per_unit numeric(20,6),
  location text,
  is_deleted boolean default false not null,
  created_at timestamp(0) default now() not null,
  updated_at timestamp(0)
);

-- Create inventory_transactions table (for tracking inventory changes)
create table if not exists inventory_transactions (
  id uuid default uuid_generate_v4() primary key,
  inventory_id uuid not null references inventory(id) on delete cascade,
  transaction_type text not null, -- in, out, adjustment
  quantity integer not null,
  notes text,
  performed_by uuid references users(id),
  created_at timestamp(0) default now() not null
);

-- Create notifications table
create table if not exists notifications (
  id uuid default uuid_generate_v4() primary key,
  hotel_id uuid references hotels(id) on delete cascade,
  title jsonb not null,
  message jsonb not null,
  type text default 'info', -- info, warning, error, success
  target_audience text, -- all, hotel_admins, front_desk, guests, specific_roles
  priority text default 'normal', -- low, normal, high, urgent
  is_read boolean default false not null,
  read_by uuid[] default '{}',
  expires_at timestamp(0),
  created_by uuid references users(id),
  created_at timestamp(0) default now() not null,
  is_deleted boolean default false not null
);

-- Create content table (for managing content, templates, etc.)
create table if not exists content (
  id uuid default uuid_generate_v4() primary key,
  hotel_id uuid references hotels(id) on delete cascade,
  title jsonb not null,
  content_type text not null, -- template, page, message, menu, policy
  content_data jsonb not null,
  version integer default 1 not null,
  is_active boolean default true not null,
  tags text[] default '{}',
  created_by uuid references users(id),
  created_at timestamp(0) default now() not null,
  updated_at timestamp(0),
  is_deleted boolean default false not null
);

-- Create content_versions table (for version control)
create table if not exists content_versions (
  id uuid default uuid_generate_v4() primary key,
  content_id uuid not null references content(id) on delete cascade,
  version integer not null,
  content_data jsonb not null,
  change_notes text,
  created_by uuid references users(id),
  created_at timestamp(0) default now() not null
);

-- Create indexes for performance
create index idx_rooms_hotel_id on rooms(hotel_id);
create index idx_rooms_status on rooms(status);
create index idx_bookings_hotel_id on bookings(hotel_id);
create index idx_bookings_room_id on bookings(room_id);
create index idx_bookings_status on bookings(status);
create index idx_bookings_dates on bookings(check_in_date, check_out_date);
create index idx_inventory_hotel_id on inventory(hotel_id);
create index idx_inventory_category on inventory(category);
create index idx_inventory_transactions_inventory_id on inventory_transactions(inventory_id);
create index idx_notifications_hotel_id on notifications(hotel_id);
create index idx_notifications_type on notifications(type);
create index idx_content_hotel_id on content(hotel_id);
create index idx_content_type on content(content_type);
create index idx_content_versions_content_id on content_versions(content_id);
create index idx_users_role_id on users(role_id);

