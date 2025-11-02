-- Note: This schema assumes user_types and sections tables exist
-- If they don't exist, you may need to create them first or remove the foreign key constraints

-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- Create user_types table if it doesn't exist (required for users.utype_id foreign key)
create table if not exists user_types (
  id text primary key,
  name text not null
);

-- Insert default user type if it doesn't exist
insert into user_types (id, name) values ('none', 'None') on conflict do nothing;

-- Create sections table if it doesn't exist (referenced by services.sub_id)
create table if not exists sections (
  id bigserial primary key,
  name text not null
);

-- Drop tables if they exist (in reverse dependency order)
drop table if exists service_products cascade;
drop table if exists hotel_users cascade;
drop table if exists services cascade;
drop table if exists products cascade;
drop table if exists users cascade;
drop table if exists hotels cascade;

-- Create hotels table
create table hotels (
  id uuid default uuid_generate_v4() primary key,
  title jsonb not null,
  site text not null unique,
  email text,
  logo_path text,
  created_at timestamp(0) default now() not null,
  updated_at timestamp(0)
);

-- Create users table
create table users (
  id uuid default uuid_generate_v4() primary key,
  name jsonb not null,
  email text,
  email_verified_at timestamp(0),
  password text,
  remember_token text,
  utype_id text default 'none' not null references user_types(id),
  active integer default 1 not null,
  is_deleted boolean default false not null,
  created_at timestamp(0) default now() not null,
  updated_at timestamp(0)
);

-- Create hotel_users junction table
create table hotel_users (
  id uuid default uuid_generate_v4() primary key,
  hotel_id uuid not null references hotels(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamp(0) default now() not null,
  is_deleted boolean default false not null,
  unique (hotel_id, user_id)
);

-- Create products table
create table products (
  id uuid default uuid_generate_v4() primary key,
  sort integer default 100 not null,
  title jsonb not null,
  descr text,
  price numeric(20,6) not null,
  image text not null,
  ext_data jsonb,
  active integer default 1 not null,
  is_deleted boolean default false not null,
  created_at timestamp(0) default now() not null,
  updated_at timestamp(0)
);

-- Create services table
create table services (
  id uuid default uuid_generate_v4() primary key,
  hotel_id uuid not null references hotels(id) on delete cascade,
  sub_id bigint references sections(id),
  title jsonb,
  sort integer default 100 not null,
  initiator_id bigint,
  active integer default 1 not null,
  is_deleted boolean default false not null,
  created_at timestamp(0) default now() not null,
  updated_at timestamp(0)
);

-- Create service_products junction table
create table service_products (
  id uuid default uuid_generate_v4() primary key,
  service_id uuid not null references services(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  created_at timestamp(0) default now() not null,
  is_deleted boolean default false not null,
  unique (service_id, product_id)
);

-- Create indexes for better query performance
create index idx_hotel_users_hotel_id on hotel_users(hotel_id);
create index idx_hotel_users_user_id on hotel_users(user_id);
create index idx_services_hotel_id on services(hotel_id);
create index idx_service_products_service_id on service_products(service_id);
create index idx_service_products_product_id on service_products(product_id);

