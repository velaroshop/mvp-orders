-- Create ad_spend_data table for ROAS Calculator
-- Stores daily ad spend data imported from Meta Ads CSV exports

CREATE TABLE IF NOT EXISTS ad_spend_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- Ad spend data (aggregated per day from all campaigns)
  amount_spent DECIMAL(10,2) NOT NULL DEFAULT 0,

  -- Meta reported metrics (for comparison)
  meta_purchases INTEGER DEFAULT 0,
  meta_purchase_value DECIMAL(10,2) DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint for UPSERT operations
  UNIQUE(organization_id, product_id, date)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_ad_spend_data_org_product ON ad_spend_data(organization_id, product_id);
CREATE INDEX IF NOT EXISTS idx_ad_spend_data_date ON ad_spend_data(date);
CREATE INDEX IF NOT EXISTS idx_ad_spend_data_org_date ON ad_spend_data(organization_id, date);

-- Enable RLS
ALTER TABLE ad_spend_data ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view ad spend data for their organization" ON ad_spend_data
  FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert ad spend data for their organization" ON ad_spend_data
  FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update ad spend data for their organization" ON ad_spend_data
  FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete ad spend data for their organization" ON ad_spend_data
  FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

-- Comment for documentation
COMMENT ON TABLE ad_spend_data IS 'Stores daily ad spend data imported from Meta Ads CSV exports for ROAS calculation';
COMMENT ON COLUMN ad_spend_data.amount_spent IS 'Total ad spend for the day (aggregated from all campaigns)';
COMMENT ON COLUMN ad_spend_data.meta_purchases IS 'Number of purchases reported by Meta for comparison';
COMMENT ON COLUMN ad_spend_data.meta_purchase_value IS 'Purchase value reported by Meta for comparison';
