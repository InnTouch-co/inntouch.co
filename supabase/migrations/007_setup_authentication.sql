-- Setup authentication and super admin user
-- This migration sets up Supabase Auth integration with the users table

-- Ensure role_id column exists (it should from migration 002)
-- Add role_id if it doesn't exist (for safety)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'role_id'
  ) THEN
    ALTER TABLE users ADD COLUMN role_id text REFERENCES roles(id);
  END IF;
END $$;

-- Update existing users without role_id to have 'staff' role
UPDATE users SET role_id = 'staff' WHERE role_id IS NULL;

-- Create a function to sync auth.users with public.users
-- This function can be called via triggers or manually
CREATE OR REPLACE FUNCTION sync_user_from_auth()
RETURNS TRIGGER AS $$
BEGIN
  -- When a user is created in auth.users, we can create a corresponding entry in public.users
  -- This is handled by the application, but we keep this for reference
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: User creation with Supabase Auth is handled by the application
-- The users table email should match auth.users email for linking

-- Add index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;

-- Add index on role_id for faster role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id) WHERE role_id IS NOT NULL;

