-- Add postal_code column to orders table
-- This field stores the postal code for the shipping address

ALTER TABLE orders ADD COLUMN IF NOT EXISTS postal_code VARCHAR(6);

COMMENT ON COLUMN orders.postal_code IS 'Postal code for shipping address (max 6 digits)';
