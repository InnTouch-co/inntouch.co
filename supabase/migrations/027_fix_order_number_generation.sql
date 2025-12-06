-- Fix order number generation to prevent race conditions
-- Use a sequence-based approach for thread-safe order number generation

-- Drop the old function
DROP FUNCTION IF EXISTS generate_order_number();

-- Create a sequence for order numbers (resets each year)
CREATE SEQUENCE IF NOT EXISTS order_number_seq
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

-- Function to generate order number with sequence
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  sequence_num INTEGER;
  order_num TEXT;
  max_attempts INTEGER := 10;
  attempt INTEGER := 0;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  
  -- Try to generate a unique order number
  LOOP
    attempt := attempt + 1;
    
    -- Get next sequence value
    sequence_num := nextval('order_number_seq');
    
    -- If sequence exceeds 999999, reset it (we use 6 digits)
    IF sequence_num > 999999 THEN
      -- Reset sequence to 1 for new year
      PERFORM setval('order_number_seq', 1, false);
      sequence_num := 1;
    END IF;
    
    -- Format: ORD-YYYY-XXXXXX (6 digits)
    order_num := 'ORD-' || year_part || '-' || LPAD(sequence_num::TEXT, 6, '0');
    
    -- Check if this order number already exists (handles year rollover)
    IF NOT EXISTS (
      SELECT 1 FROM orders 
      WHERE order_number = order_num 
        AND is_deleted = FALSE
    ) THEN
      RETURN order_num;
    END IF;
    
    -- If we've tried too many times, use timestamp as fallback
    IF attempt >= max_attempts THEN
      order_num := 'ORD-' || year_part || '-' || LPAD(EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT, 10, '0');
      -- Check one more time
      IF NOT EXISTS (
        SELECT 1 FROM orders 
        WHERE order_number = order_num 
          AND is_deleted = FALSE
      ) THEN
        RETURN order_num;
      END IF;
      -- Last resort: use timestamp + random
      order_num := 'ORD-' || year_part || '-' || LPAD((EXTRACT(EPOCH FROM NOW())::BIGINT + (RANDOM() * 1000)::INTEGER)::TEXT, 10, '0');
      RETURN order_num;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Initialize sequence based on existing orders
DO $$
DECLARE
  year_part TEXT;
  max_seq INTEGER;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  
  -- Get the maximum sequence number for current year
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 9) AS INTEGER)), 0)
  INTO max_seq
  FROM orders
  WHERE order_number LIKE 'ORD-' || year_part || '-%'
    AND is_deleted = FALSE;
  
  -- Set sequence to max + 1 to avoid conflicts
  IF max_seq > 0 THEN
    PERFORM setval('order_number_seq', max_seq + 1, false);
  ELSE
    PERFORM setval('order_number_seq', 1, false);
  END IF;
END $$;

