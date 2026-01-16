-- Create partial_orders table for tracking abandoned/incomplete orders
-- This allows recovery of partially filled forms to increase conversion

CREATE TABLE IF NOT EXISTS partial_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Landing & Offer
  landing_key TEXT NOT NULL,
  offer_code TEXT,

  -- Customer Information (all optional as form may be incomplete)
  phone TEXT,
  full_name TEXT,
  county TEXT,
  city TEXT,
  address TEXT,
  postal_code TEXT,

  -- Product Information
  product_name TEXT,
  product_sku TEXT,
  product_quantity INTEGER,
  upsells JSONB DEFAULT '[]',

  -- Pricing (calculated from product + upsells)
  subtotal DECIMAL(10,2),
  shipping_cost DECIMAL(10,2),
  total DECIMAL(10,2),

  -- Tracking & Metadata
  last_completed_field TEXT, -- Last field user filled (e.g., "phone", "name", "address")
  completion_percentage INTEGER DEFAULT 0, -- 0-100%

  -- Status for follow-up
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'refused', 'unanswered', 'call_later'

  -- Conversion tracking
  converted_to_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  converted_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  abandoned_at TIMESTAMP WITH TIME ZONE -- When user left the form
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_partial_orders_organization_id ON partial_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_partial_orders_phone ON partial_orders(phone);
CREATE INDEX IF NOT EXISTS idx_partial_orders_status ON partial_orders(status);
CREATE INDEX IF NOT EXISTS idx_partial_orders_created_at ON partial_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_partial_orders_landing_key ON partial_orders(landing_key);

-- Composite index for common queries (organization + status + created_at)
CREATE INDEX IF NOT EXISTS idx_partial_orders_org_status_created ON partial_orders(organization_id, status, created_at DESC);

-- Comments
COMMENT ON TABLE partial_orders IS 'Tracks partially filled order forms for recovery and conversion optimization';
COMMENT ON COLUMN partial_orders.last_completed_field IS 'Last form field the user completed before abandoning';
COMMENT ON COLUMN partial_orders.completion_percentage IS 'Percentage of required fields completed (0-100)';
COMMENT ON COLUMN partial_orders.status IS 'Follow-up status: pending, accepted, refused, unanswered, call_later';
COMMENT ON COLUMN partial_orders.abandoned_at IS 'Timestamp when user left the form (no activity for 30+ seconds)';
