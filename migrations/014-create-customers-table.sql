-- Create customers table
-- Customers are indexed by phone number for analytics and search
-- Orders table keeps all original data for each order

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

-- Comments
COMMENT ON TABLE customers IS 'Customer index for analytics and search by phone number';
COMMENT ON COLUMN customers.phone IS 'Unique phone number identifier';
COMMENT ON COLUMN customers.total_orders IS 'Total number of orders placed by this customer';
COMMENT ON COLUMN customers.total_spent IS 'Total amount spent by this customer across all orders';
