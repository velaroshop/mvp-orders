-- Migration 032: Add confirmed_by field to orders table
-- Track which user confirmed/created each order

-- Add confirmed_by field
ALTER TABLE orders ADD COLUMN IF NOT EXISTS confirmed_by UUID REFERENCES users(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_confirmed_by ON orders(confirmed_by);

-- Set existing orders to the organization owner
UPDATE orders
SET confirmed_by = (
  SELECT om.user_id
  FROM organization_members om
  WHERE om.organization_id = orders.organization_id
  AND om.role = 'owner'
  AND om.is_active = true
  LIMIT 1
)
WHERE confirmed_by IS NULL;
