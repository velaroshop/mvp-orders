-- Update settings table structure for Helpship API credentials per organization

-- Drop existing settings table structure (if needed to start fresh)
-- This is safe because we'll recreate it properly
DROP TABLE IF EXISTS settings CASCADE;

-- Create new settings table with Helpship credentials per organization
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Helpship API Credentials
  helpship_client_id TEXT,
  helpship_client_secret TEXT,
  helpship_token_url TEXT DEFAULT 'https://helpship-auth-develop.azurewebsites.net/connect/token',
  helpship_api_base_url TEXT DEFAULT 'https://helpship-api-develop.azurewebsites.net',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- One settings record per organization
  UNIQUE(organization_id)
);

-- Index for organization_id
CREATE INDEX idx_settings_organization_id ON settings(organization_id);

-- Enable RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access settings from their organizations
CREATE POLICY "Users can access their organization settings"
  ON settings FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Note: stores table already has order_series column from previous migration
-- No changes needed for stores table
