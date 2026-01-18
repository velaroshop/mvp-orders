-- Migration 026: Add per-store order counter
-- Date: 2026-01-18
-- Description: Add order counter to stores table and update order number generation

-- Add order_counter column to stores table
ALTER TABLE stores ADD COLUMN IF NOT EXISTS order_counter INTEGER DEFAULT 0;

-- Comment explaining the column
COMMENT ON COLUMN stores.order_counter IS 'Counter for generating sequential order numbers per store. Increments with each new order.';

-- Function to get next order number for a specific store
-- This function atomically increments the counter and returns the new value
CREATE OR REPLACE FUNCTION get_next_order_number_for_store(p_store_id UUID)
RETURNS INTEGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  -- Atomically increment and return the new counter value
  UPDATE stores
  SET order_counter = order_counter + 1
  WHERE id = p_store_id
  RETURNING order_counter INTO next_num;

  -- If store not found, return NULL
  IF next_num IS NULL THEN
    RAISE EXCEPTION 'Store with id % not found', p_store_id;
  END IF;

  RETURN next_num;
END;
$$ LANGUAGE plpgsql;

-- Update the trigger function to use store-based counter
-- Note: This requires the landing_key to be set before order_number is generated
DROP TRIGGER IF EXISTS set_order_number_trigger ON orders;
DROP FUNCTION IF EXISTS set_order_number();

CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
DECLARE
  v_store_id UUID;
  next_num INTEGER;
BEGIN
  -- Only generate order_number if not already set
  IF NEW.order_number IS NULL THEN
    -- Get store_id from landing_pages table using landing_key
    SELECT store_id INTO v_store_id
    FROM landing_pages
    WHERE slug = NEW.landing_key
    LIMIT 1;

    IF v_store_id IS NULL THEN
      -- If no store found, use the global sequence as fallback
      RAISE WARNING 'No store found for landing_key %, using global sequence', NEW.landing_key;
      NEW.order_number := nextval('order_number_seq');
    ELSE
      -- Get next order number for this specific store
      NEW.order_number := get_next_order_number_for_store(v_store_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER set_order_number_trigger
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_order_number();

-- Initialize order_counter for existing stores based on their current max order number
-- This ensures new orders continue from the correct number
DO $$
DECLARE
  store_record RECORD;
  max_order_num INTEGER;
BEGIN
  FOR store_record IN SELECT id FROM stores LOOP
    -- Find max order_number for orders from this store's landing pages
    SELECT COALESCE(MAX(o.order_number), 0) INTO max_order_num
    FROM orders o
    JOIN landing_pages lp ON lp.slug = o.landing_key
    WHERE lp.store_id = store_record.id;

    -- Set the counter to the max value found
    UPDATE stores
    SET order_counter = max_order_num
    WHERE id = store_record.id;

    RAISE NOTICE 'Initialized store % with order_counter = %', store_record.id, max_order_num;
  END LOOP;
END $$;
