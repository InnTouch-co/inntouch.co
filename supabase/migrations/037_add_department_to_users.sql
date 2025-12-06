-- Add department field to users table for kitchen/bar staff assignment
-- Department can be 'kitchen', 'bar', 'both', or NULL (for non-staff or unassigned staff)

ALTER TABLE users
ADD COLUMN IF NOT EXISTS department TEXT 
  CHECK (department IN ('kitchen', 'bar', 'both'))
  DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN users.department IS 'Department assignment for staff members: kitchen (food orders), bar (drink orders), both (all orders), or NULL (not assigned)';

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department) WHERE department IS NOT NULL;


