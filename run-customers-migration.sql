-- Combined migration: Create customers table and link with orders
-- Run this in Supabase Dashboard -> SQL Editor

-- STEP 1: Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  phone VARCHAR(10) NOT NULL,

  -- Analytics fields (calculated from orders)
  first_order_date TIMESTAMP WITH TIME ZONE,
  last_order_date TIMESTAMP WITH TIME ZONE,
  total_orders INTEGER DEFAULT 0,
  total_spent DECIMAL(10, 2) DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique constraint: one customer per phone per organization
  UNIQUE(organization_id, phone)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_org_phone ON customers(organization_id, phone);
CREATE INDEX IF NOT EXISTS idx_customers_total_orders ON customers(organization_id, total_orders);
CREATE INDEX IF NOT EXISTS idx_customers_total_spent ON customers(organization_id, total_spent);

-- RLS Policies
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their organization customers"
  ON customers FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- STEP 2: Add customer_id column to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);

-- STEP 3: Populate customers from existing orders
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

-- STEP 4: Link existing orders to customers
UPDATE orders o
SET customer_id = c.id
FROM customers c
WHERE o.organization_id = c.organization_id
  AND o.phone = c.phone
  AND o.customer_id IS NULL;

-- STEP 5: Create index on customer_id
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);

-- STEP 6 (OPTIONAL): Make customer_id NOT NULL after verifying all orders are linked
-- Uncomment after running migration and verifying:
-- ALTER TABLE orders ALTER COLUMN customer_id SET NOT NULL;
