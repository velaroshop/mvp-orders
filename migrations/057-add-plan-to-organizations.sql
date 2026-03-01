-- Add plan column to organizations table
-- Values: 'pro' (full features with upsells) or 'basic' (no upsells)
-- Default 'pro' so all existing organizations keep full functionality

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'pro';

-- Ensure all existing organizations are set to 'pro'
UPDATE organizations SET plan = 'pro' WHERE plan IS NULL;
