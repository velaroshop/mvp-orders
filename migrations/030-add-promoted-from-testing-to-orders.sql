-- Add promoted_from_testing field to orders table
-- Tracks whether an order was originally a testing order that got promoted to real order

ALTER TABLE orders ADD COLUMN IF NOT EXISTS promoted_from_testing BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN orders.promoted_from_testing IS 'Indicates if this order was promoted from testing status to real order';
