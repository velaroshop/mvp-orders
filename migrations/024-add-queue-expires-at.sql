-- Migration 024: Add queue_expires_at timestamp for postsale decision window
-- Date: 2026-01-18
-- Description: Add absolute timestamp to track when queue status expires (3 minutes from order creation)

-- Add queue_expires_at column (nullable for backward compatibility)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS queue_expires_at TIMESTAMPTZ;

-- Create index for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_orders_queue_expires_at
ON orders(queue_expires_at)
WHERE status = 'queue';

-- Comment explaining the column
COMMENT ON COLUMN orders.queue_expires_at IS 'Absolute timestamp when queue status expires and order should be auto-finalized (3 minutes from creation). NULL for non-queue orders.';
