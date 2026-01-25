-- Create system_settings table for global platform settings
-- This table should only have ONE row

CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  helpship_environment TEXT NOT NULL DEFAULT 'production' CHECK (helpship_environment IN ('development', 'production')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default row with production environment
INSERT INTO system_settings (helpship_environment)
VALUES ('production')
ON CONFLICT DO NOTHING;

-- Ensure only one row can exist
CREATE UNIQUE INDEX IF NOT EXISTS idx_system_settings_singleton ON system_settings ((true));

-- Add comment for documentation
COMMENT ON TABLE system_settings IS 'Global platform settings. Only one row should exist.';
COMMENT ON COLUMN system_settings.helpship_environment IS 'Helpship API environment: development or production';
