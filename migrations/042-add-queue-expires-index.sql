-- Add index for efficient queue expiration queries
-- Used by cron job to find expired queue orders

-- Partial index: only indexes rows where status = 'queue'
-- This is very efficient because only a small number of orders are in queue at any time
CREATE INDEX IF NOT EXISTS idx_orders_queue_expires
ON orders(queue_expires_at)
WHERE status = 'queue';

-- Comment for documentation
COMMENT ON INDEX idx_orders_queue_expires IS 'Partial index for efficient queue expiration cron job queries';
