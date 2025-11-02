-- Add must_change_password field to users table
-- This flag will be set to true when user is first created, forcing password change on first login

alter table users 
add column if not exists must_change_password boolean default true;

-- Create index for must_change_password if needed
create index if not exists idx_users_must_change_password on users(must_change_password);

-- Set existing users to false (they don't need to change password)
-- New users will have must_change_password = true by default
update users set must_change_password = false where must_change_password is null;

