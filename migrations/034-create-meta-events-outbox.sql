-- Migration 034: Create meta_events_outbox table for CAPI retry mechanism
-- Implements outbox pattern for reliable Meta Conversions API event delivery

CREATE TABLE IF NOT EXISTS meta_events_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  payload JSONB NOT NULL,
  attempts INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  last_attempt_at TIMESTAMP,
  next_retry_at TIMESTAMP,
  last_error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add check constraint for status (only if doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_outbox_status'
  ) THEN
    ALTER TABLE meta_events_outbox ADD CONSTRAINT chk_outbox_status
      CHECK (status IN ('pending', 'sent', 'failed'));
  END IF;
END $$;

-- Add check constraint for event_name (only if doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_outbox_event_name'
  ) THEN
    ALTER TABLE meta_events_outbox ADD CONSTRAINT chk_outbox_event_name
      CHECK (event_name IN ('Purchase', 'InitiateCheckout', 'ViewContent', 'PageView'));
  END IF;
END $$;

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_outbox_status ON meta_events_outbox(status);
CREATE INDEX IF NOT EXISTS idx_outbox_next_retry ON meta_events_outbox(next_retry_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_outbox_order_id ON meta_events_outbox(order_id);
CREATE INDEX IF NOT EXISTS idx_outbox_created_at ON meta_events_outbox(created_at DESC);

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_meta_events_outbox_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic updated_at
DROP TRIGGER IF EXISTS trg_meta_events_outbox_updated_at ON meta_events_outbox;
CREATE TRIGGER trg_meta_events_outbox_updated_at
  BEFORE UPDATE ON meta_events_outbox
  FOR EACH ROW
  EXECUTE FUNCTION update_meta_events_outbox_updated_at();

-- Add comments for documentation
COMMENT ON TABLE meta_events_outbox IS 'Outbox pattern for reliable Meta Conversions API event delivery with retry mechanism';
COMMENT ON COLUMN meta_events_outbox.order_id IS 'Reference to the order this event belongs to';
COMMENT ON COLUMN meta_events_outbox.event_name IS 'Meta event type (Purchase, InitiateCheckout, ViewContent, PageView)';
COMMENT ON COLUMN meta_events_outbox.payload IS 'Complete event payload as JSON for CAPI';
COMMENT ON COLUMN meta_events_outbox.attempts IS 'Number of delivery attempts made';
COMMENT ON COLUMN meta_events_outbox.next_retry_at IS 'Timestamp for next retry attempt (exponential backoff)';
