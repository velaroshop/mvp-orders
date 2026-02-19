-- Migration 054: Add Meta Ads token expiry tracking
-- Stores the expiration timestamp of the Meta Ads access token
-- Used to show remaining validity and enable proactive renewal

ALTER TABLE settings ADD COLUMN IF NOT EXISTS meta_ads_token_expires_at TIMESTAMPTZ;
