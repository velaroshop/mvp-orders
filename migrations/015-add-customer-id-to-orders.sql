-- Add customer_id to orders table and populate from existing data

-- Step 1: Add customer_id column (nullable initially)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);

-- Step 2: Populate customers table from existing orders
-- Group by organization + phone to create unique customers
INSERT INTO customers (organization_id, phone, first_order_date, last_order_date, total_orders, total_spent, created_at)
SELECT
  organization_id,
  phone,
  MIN(created_at) as first_order_date,
  MAX(created_at) as last_order_date,
  COUNT(*) as total_orders,
  SUM(total) as total_spent,
  MIN(created_at) as created_at
FROM orders
WHERE phone IS NOT NULL
  AND phone != ''
  AND organization_id IS NOT NULL  -- Skip orders with NULL organization_id
GROUP BY organization_id, phone
ON CONFLICT (organization_id, phone) DO NOTHING;

-- Step 3: Link existing orders to customers
UPDATE orders o
SET customer_id = c.id
FROM customers c
WHERE o.organization_id = c.organization_id
  AND o.phone = c.phone
  AND o.customer_id IS NULL;

-- Step 4: Make customer_id NOT NULL (after all orders are linked)
-- Note: Run this manually after verifying all orders have customer_id
-- ALTER TABLE orders ALTER COLUMN customer_id SET NOT NULL;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);

-- Comments
COMMENT ON COLUMN orders.customer_id IS 'Reference to customer table for analytics (phone and full_name still kept in orders for history)';
