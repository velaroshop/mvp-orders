-- Migration 066: Add blacklist support to customers
-- Allows organizations to blacklist customers by phone number.
-- Blacklisted customers' orders are auto-cancelled with note "BLACKLIST" and not synced to Helpship.
-- Existing customers are NOT affected (is_blacklisted defaults to false).

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS is_blacklisted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS blacklisted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS blacklisted_reason TEXT;

-- Index for quick lookup during order finalization
CREATE INDEX IF NOT EXISTS idx_customers_blacklisted
  ON customers(id) WHERE is_blacklisted = true;
