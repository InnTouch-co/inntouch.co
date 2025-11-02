-- Update existing role permissions to remove inventory references
-- This updates roles that may have been created before inventory was removed

update roles 
set permissions = permissions - 'inventory'
where permissions ? 'inventory';

-- Note: This will only remove the 'inventory' key from permissions JSON if it exists
-- Other permissions remain unchanged

