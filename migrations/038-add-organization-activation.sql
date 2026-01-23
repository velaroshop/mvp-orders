-- Migration: Add is_active and is_superadmin columns to organizations table
-- Purpose: Allow superadmin to activate/deactivate organizations

-- Add is_active column (default false for new organizations)
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;

-- Add is_superadmin column (default false)
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN DEFAULT false;

-- Set existing organizations as active (so they don't get locked out)
UPDATE organizations SET is_active = true WHERE is_active IS NULL OR is_active = false;

-- Create index for faster queries on is_active
CREATE INDEX IF NOT EXISTS idx_organizations_is_active ON organizations(is_active);

-- Create index for superadmin lookup
CREATE INDEX IF NOT EXISTS idx_organizations_is_superadmin ON organizations(is_superadmin);
