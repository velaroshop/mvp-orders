-- Add order_series column to orders table
-- This stores a snapshot of the order series at the time of order creation

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS order_series TEXT;

-- Add comment to explain the purpose
COMMENT ON COLUMN orders.order_series IS 'Snapshot of the store order series prefix at order creation time (e.g., "VLRSP-", "JMR-TEST-")';
