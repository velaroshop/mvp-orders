-- Add 'sync_error' status to orders table
-- This status is used when an order is created locally but fails to sync with Helpship

-- Note: PostgreSQL doesn't use ENUMs for text columns, so we just need to ensure
-- the application layer accepts this new value. No schema change needed if using TEXT type.
-- This migration serves as documentation for the new status value.

-- If you want to add a CHECK constraint to enforce valid statuses:
-- First, drop the existing constraint if it exists
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- Add new constraint with all valid statuses including 'sync_error'
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'confirmed', 'cancelled', 'hold', 'sync_error'));

-- Add comment to document the new status
COMMENT ON COLUMN orders.status IS 'Order status: pending (default), confirmed, cancelled, hold, sync_error (failed to sync with Helpship)';
