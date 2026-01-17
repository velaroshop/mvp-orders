-- Add partial_number field to partial_orders table
-- This is an auto-incrementing integer that provides a simple, readable ID for partial orders

-- Add the column
ALTER TABLE partial_orders ADD COLUMN IF NOT EXISTS partial_number SERIAL;

-- Create a sequence if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS partial_orders_partial_number_seq;

-- Set the sequence ownership
ALTER SEQUENCE partial_orders_partial_number_seq OWNED BY partial_orders.partial_number;

-- Update existing rows to have sequential numbers starting from 1
DO $$
DECLARE
  row_record RECORD;
  counter INTEGER := 1;
BEGIN
  FOR row_record IN
    SELECT id FROM partial_orders ORDER BY created_at ASC
  LOOP
    UPDATE partial_orders SET partial_number = counter WHERE id = row_record.id;
    counter := counter + 1;
  END LOOP;

  -- Set the sequence to continue from the last assigned number
  PERFORM setval('partial_orders_partial_number_seq', counter);
END $$;

-- Create index for faster lookups by partial_number
CREATE INDEX IF NOT EXISTS idx_partial_orders_partial_number ON partial_orders(partial_number);

COMMENT ON COLUMN partial_orders.partial_number IS 'Auto-incrementing number for partial orders, starting from 1';
