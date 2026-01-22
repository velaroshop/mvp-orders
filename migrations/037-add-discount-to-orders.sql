-- Add discount column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount NUMERIC(10, 2) DEFAULT 0;

-- Add comment to explain the field
COMMENT ON COLUMN orders.discount IS 'Discount amount applied to the order';
