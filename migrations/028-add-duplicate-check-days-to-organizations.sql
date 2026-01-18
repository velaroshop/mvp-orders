-- Add duplicate_check_days field to organizations table
-- This setting controls how many days back to check for duplicate orders when confirming partial orders

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS duplicate_check_days INTEGER DEFAULT 21;

COMMENT ON COLUMN organizations.duplicate_check_days IS 'Number of days to check for duplicate orders from the same phone number when confirming partial orders (default: 21)';
