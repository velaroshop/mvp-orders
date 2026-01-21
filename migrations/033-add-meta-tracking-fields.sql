-- Migration 033: Add Meta Conversion Tracking fields to orders and landing_pages tables
-- Enables Facebook Pixel and Conversions API tracking for purchase events

-- ============================================================
-- PART 1: Add tracking fields to orders table
-- ============================================================

-- Tracking parameters (hybrid approach: key fields + JSONB for flexibility)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fbclid TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fbc TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS gclid TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS ttclid TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_data JSONB DEFAULT '{}'::jsonb;

-- URL tracking
ALTER TABLE orders ADD COLUMN IF NOT EXISTS landing_url TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS event_source_url TEXT;

-- Meta CAPI status tracking
ALTER TABLE orders ADD COLUMN IF NOT EXISTS meta_purchase_status TEXT DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS meta_purchase_event_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS meta_purchase_sent_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS meta_purchase_last_error TEXT;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_fbclid ON orders(fbclid) WHERE fbclid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_meta_purchase_status ON orders(meta_purchase_status);
CREATE INDEX IF NOT EXISTS idx_orders_meta_purchase_event_id ON orders(meta_purchase_event_id) WHERE meta_purchase_event_id IS NOT NULL;

-- Add check constraint for meta_purchase_status (only if doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_meta_purchase_status'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT chk_meta_purchase_status
      CHECK (meta_purchase_status IN ('pending', 'sent', 'failed'));
  END IF;
END $$;

-- ============================================================
-- PART 2: Add test mode fields to landing_pages table
-- ============================================================

ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS meta_test_mode BOOLEAN DEFAULT false;
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS meta_test_event_code TEXT;

-- Create index for test mode filtering
CREATE INDEX IF NOT EXISTS idx_landing_pages_meta_test_mode ON landing_pages(meta_test_mode);

-- Add comment for documentation
COMMENT ON COLUMN landing_pages.meta_test_mode IS 'Enable Meta test mode for this landing page (sends test_event_code with events)';
COMMENT ON COLUMN landing_pages.meta_test_event_code IS 'Meta test event code for validating events in Events Manager';
