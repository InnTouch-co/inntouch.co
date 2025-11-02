-- Create super admin user for beksultanggd@gmail.com
-- Run this SQL in your Supabase SQL Editor

-- First, make sure the user exists in auth.users (they should already)
-- Then insert into users table:

INSERT INTO users (name, email, utype_id, active, role_id)
VALUES (
  '{"en": "Super Admin"}'::jsonb,
  'beksultanggd@gmail.com',
  'admin',
  1,
  'super_admin'
)
ON CONFLICT (email) DO UPDATE
SET 
  name = EXCLUDED.name,
  utype_id = EXCLUDED.utype_id,
  active = EXCLUDED.active,
  role_id = EXCLUDED.role_id,
  updated_at = now();

-- If the above doesn't work (because there's no unique constraint on email),
-- use this instead:

DO $$
BEGIN
  -- Check if user already exists
  IF NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'beksultanggd@gmail.com'
  ) THEN
    INSERT INTO users (name, email, utype_id, active, role_id)
    VALUES (
      '{"en": "Super Admin"}'::jsonb,
      'beksultanggd@gmail.com',
      'admin',
      1,
      'super_admin'
    );
  ELSE
    -- Update existing user
    UPDATE users
    SET 
      name = '{"en": "Super Admin"}'::jsonb,
      utype_id = 'admin',
      active = 1,
      role_id = 'super_admin',
      updated_at = now()
    WHERE email = 'beksultanggd@gmail.com';
  END IF;
END $$;

