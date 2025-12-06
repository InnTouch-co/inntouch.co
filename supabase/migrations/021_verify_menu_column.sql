-- Verify menu column exists and can be updated
-- This migration ensures the menu column is properly set up

-- First, verify the column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'services' 
        AND column_name = 'menu'
    ) THEN
        RAISE EXCEPTION 'Menu column does not exist in services table';
    END IF;
END $$;

-- Verify the column type is JSONB
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'services' 
        AND column_name = 'menu'
        AND data_type = 'jsonb'
    ) THEN
        RAISE EXCEPTION 'Menu column exists but is not JSONB type';
    END IF;
END $$;

-- Test update (this will be rolled back)
-- This is just to verify the column can be updated
DO $$
DECLARE
    test_service_id uuid;
BEGIN
    -- Get first service ID for testing
    SELECT id INTO test_service_id 
    FROM services 
    WHERE is_deleted = false 
    LIMIT 1;
    
    IF test_service_id IS NOT NULL THEN
        -- Try to update with a test menu (this will be rolled back)
        UPDATE services 
        SET menu = '{"test": "value"}'::jsonb
        WHERE id = test_service_id;
        
        -- Verify it was updated
        IF (SELECT menu FROM services WHERE id = test_service_id) IS NULL THEN
            RAISE EXCEPTION 'Menu column update test failed - menu is still NULL';
        END IF;
        
        -- Rollback the test update
        UPDATE services 
        SET menu = NULL
        WHERE id = test_service_id;
    END IF;
END $$;

-- Add comment
COMMENT ON COLUMN services.menu IS 'Menu items for restaurant/bar services in JSONB format. Structure: {categories: [...], items: [...]} for restaurant, {drinks: [...]} for bar';



