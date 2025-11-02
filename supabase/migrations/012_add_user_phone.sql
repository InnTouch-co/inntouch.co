-- Add phone column to users table
-- This migration adds a phone number field to store user contact information

alter table users 
add column if not exists phone text;

