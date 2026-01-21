-- Migration 035: Add Meta test mode fields to settings table
-- Allows global test mode configuration for Meta Conversions API

-- Add Meta test mode fields to settings
ALTER TABLE settings ADD COLUMN IF NOT EXISTS meta_test_mode BOOLEAN DEFAULT false;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS meta_test_event_code TEXT;

-- Add comments for documentation
COMMENT ON COLUMN settings.meta_test_mode IS 'Enable Meta test mode globally for all landing pages';
COMMENT ON COLUMN settings.meta_test_event_code IS 'Meta test event code for validating events in Events Manager (used when meta_test_mode is true)';
