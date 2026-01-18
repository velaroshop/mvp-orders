-- Create upsells table for presale and postsale upsells
CREATE TABLE IF NOT EXISTS upsells (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  landing_page_id UUID NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,

  -- Upsell type: presale or postsale
  type TEXT NOT NULL CHECK (type IN ('presale', 'postsale')),

  -- Product reference
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,

  -- Upsell details
  title TEXT NOT NULL,
  description TEXT, -- Optional, mainly for postsale
  quantity INTEGER NOT NULL DEFAULT 1,

  -- Pricing
  srp DECIMAL(10, 2) NOT NULL, -- Suggested Retail Price
  price DECIMAL(10, 2) NOT NULL, -- Sale price

  -- Media
  media_url TEXT, -- Single image URL

  -- Status and ordering
  active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_upsells_landing_page_id ON upsells(landing_page_id);
CREATE INDEX IF NOT EXISTS idx_upsells_organization_id ON upsells(organization_id);
CREATE INDEX IF NOT EXISTS idx_upsells_product_id ON upsells(product_id);
CREATE INDEX IF NOT EXISTS idx_upsells_type ON upsells(type);
CREATE INDEX IF NOT EXISTS idx_upsells_active ON upsells(active);

-- Add RLS policies
ALTER TABLE upsells ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (for API routes)
CREATE POLICY "Service role can manage all upsells"
  ON upsells
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Authenticated users can view all upsells (filtered by organization_id in API)
CREATE POLICY "Authenticated users can view upsells"
  ON upsells FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can insert upsells (organization_id validated in API)
CREATE POLICY "Authenticated users can insert upsells"
  ON upsells FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated users can update upsells (organization_id validated in API)
CREATE POLICY "Authenticated users can update upsells"
  ON upsells FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Authenticated users can delete upsells (organization_id validated in API)
CREATE POLICY "Authenticated users can delete upsells"
  ON upsells FOR DELETE
  TO authenticated
  USING (true);
