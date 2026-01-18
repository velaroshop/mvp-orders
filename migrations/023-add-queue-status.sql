-- Migration 023: Add "queue" status to orders table
-- Date: 2026-01-18
-- Description: Add "queue" status for orders awaiting postsale decision

-- Drop existing constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- Add updated constraint with "queue" status
ALTER TABLE orders ADD CONSTRAINT orders_status_check
CHECK (status IN ('queue', 'pending', 'confirmed', 'cancelled', 'hold', 'sync_error'));

-- Note: "queue" is the initial status for orders waiting for postsale upsell decision (3 minutes)
-- After decision, status changes to "pending" when order is synced to Helpship
