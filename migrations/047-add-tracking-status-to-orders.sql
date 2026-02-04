-- Add tracking_status and tracking_updated_at columns to orders table
-- tracking_status: Helpship tracking status (InTransit, Delivered, Returned, etc.)
-- tracking_updated_at: Timestamp of the last tracking status update

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS tracking_status TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS tracking_updated_at TIMESTAMPTZ DEFAULT NULL;

-- Add index for faster queries on tracking status
CREATE INDEX IF NOT EXISTS idx_orders_tracking_status ON orders(tracking_status) WHERE tracking_status IS NOT NULL;

-- Add index for confirmed orders with helpship_order_id (for cron job efficiency)
CREATE INDEX IF NOT EXISTS idx_orders_confirmed_helpship ON orders(status, helpship_order_id, created_at)
WHERE status = 'confirmed' AND helpship_order_id IS NOT NULL;

COMMENT ON COLUMN orders.tracking_status IS 'Tracking status from Helpship: Unknown, InTransit, Delivered, Returned, Cancelled, etc.';
COMMENT ON COLUMN orders.tracking_updated_at IS 'Timestamp when tracking status was last synced from Helpship';
