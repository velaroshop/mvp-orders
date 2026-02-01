-- Migration 044: Create facebook_pages table for Comments Moderation module
-- Stores Facebook page credentials for comment moderation

CREATE TABLE IF NOT EXISTS facebook_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  page_name TEXT NOT NULL,
  page_id TEXT NOT NULL,
  page_access_token TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_facebook_pages_org_id ON facebook_pages(organization_id);
CREATE INDEX IF NOT EXISTS idx_facebook_pages_page_id ON facebook_pages(page_id);

-- RLS
ALTER TABLE facebook_pages ENABLE ROW LEVEL SECURITY;

-- Comments
COMMENT ON TABLE facebook_pages IS 'Facebook pages configured for comment moderation per organization';
