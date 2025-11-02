-- Add user types for the system
-- Super Users create Admins, and Admins can create other user types

insert into user_types (id, name) values 
  ('admin', 'Admin'),
  ('staff', 'Staff'),
  ('manager', 'Manager')
on conflict (id) do nothing;

-- Note: 'none' user type already exists from initial schema

