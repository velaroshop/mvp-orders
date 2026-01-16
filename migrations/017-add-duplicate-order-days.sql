-- Add duplicate_order_days field to stores table
-- This setting controls how many days back to check for duplicate orders from the same customer

ALTER TABLE stores
ADD COLUMN IF NOT EXISTS duplicate_order_days INTEGER DEFAULT 14;

COMMENT ON COLUMN stores.duplicate_order_days IS 'Number of days to check for duplicate orders from the same customer (default: 14)';
