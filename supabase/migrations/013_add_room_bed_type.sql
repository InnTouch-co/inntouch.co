-- Add bed_type column to rooms table
alter table rooms 
add column if not exists bed_type text;

