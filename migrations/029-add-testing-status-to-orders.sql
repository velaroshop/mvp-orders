-- Add 'testing' status to orders table
-- Testing orders are created when product status is 'testing' and should NOT be synced to Helpship

-- Update status constraint to include 'testing'
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('pending', 'confirmed', 'cancelled', 'queue', 'sync_error', 'testing'));

-- Add comment
COMMENT ON CONSTRAINT orders_status_check ON orders IS 'Order status: pending (synced to Helpship), confirmed, cancelled, queue (waiting for postsale), sync_error (failed to sync), testing (product in testing mode - not synced to Helpship)';
