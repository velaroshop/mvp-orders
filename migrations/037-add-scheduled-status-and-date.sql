-- Add 'scheduled' status to orders table
-- Scheduled orders are confirmed with a future date and will be auto-confirmed by cron job

-- Update status constraint to include 'scheduled'
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('pending', 'confirmed', 'cancelled', 'queue', 'hold', 'sync_error', 'testing', 'scheduled'));

-- Add scheduled_date column
ALTER TABLE orders ADD COLUMN IF NOT EXISTS scheduled_date DATE;

-- Add comment on constraint
COMMENT ON CONSTRAINT orders_status_check ON orders IS 'Order status: pending (synced to Helpship), confirmed, cancelled, queue (waiting for postsale), hold (on hold in Helpship), sync_error (failed to sync), testing (product in testing mode - not synced to Helpship), scheduled (confirmed with future date - awaiting auto-confirmation)';

-- Add comment on column
COMMENT ON COLUMN orders.scheduled_date IS 'Scheduled date for order confirmation (only applicable when status=scheduled). Cron job runs daily to auto-confirm orders when scheduled_date arrives.';
