-- Add from_partial_id column to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS from_partial_id UUID REFERENCES partial_orders(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_from_partial_id ON orders(from_partial_id);
