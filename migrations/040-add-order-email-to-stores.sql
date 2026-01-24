-- Migration: Add order_email column to stores table
-- Purpose: Store email address to be used when sending orders to Helpship

ALTER TABLE stores
ADD COLUMN IF NOT EXISTS order_email VARCHAR(255);

-- Add comment for clarity
COMMENT ON COLUMN stores.order_email IS 'Email address used when sending orders to Helpship for this store';
