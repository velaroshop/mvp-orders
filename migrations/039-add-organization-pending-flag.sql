-- Migration: Add is_pending flag to organizations
-- Purpose: Distinguish between newly registered orgs (pending) and intentionally deactivated ones (suspended)
--
-- Organization states:
-- 1. Pending (new): is_active = false, is_pending = true
-- 2. Active: is_active = true, is_pending = false
-- 3. Suspended (deactivated by superadmin): is_active = false, is_pending = false

-- Add is_pending column
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS is_pending BOOLEAN DEFAULT false;

-- Set existing inactive organizations as NOT pending (they are suspended, not new)
-- Only new signups should have is_pending = true
UPDATE organizations
SET is_pending = false
WHERE is_pending IS NULL;

-- Add comment for clarity
COMMENT ON COLUMN organizations.is_pending IS 'True for newly registered organizations awaiting first activation. False for suspended or active orgs.';
