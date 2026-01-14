-- Add hold_from_status column to track status before hold
-- This allows UNHOLD to restore the previous status

ALTER TABLE orders ADD COLUMN IF NOT EXISTS hold_from_status TEXT;

COMMENT ON COLUMN orders.hold_from_status IS 'Stores the order status before it was put on hold (pending or confirmed). Used to restore status on unhold.';
