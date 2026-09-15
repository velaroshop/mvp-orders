-- Widget Events Log Table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS widget_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  session_id text NOT NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  landing_key text,
  event_type text NOT NULL,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  error_message text,
  error_code int,
  field_errors jsonb,
  metadata jsonb
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_widget_events_created_at ON widget_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_widget_events_organization_id ON widget_events (organization_id);
CREATE INDEX IF NOT EXISTS idx_widget_events_event_type ON widget_events (event_type);
CREATE INDEX IF NOT EXISTS idx_widget_events_session_id ON widget_events (session_id);
CREATE INDEX IF NOT EXISTS idx_widget_events_order_id ON widget_events (order_id);
CREATE INDEX IF NOT EXISTS idx_widget_events_landing_key ON widget_events (landing_key);

-- Grant access to service role (used by supabaseAdmin)
GRANT ALL ON widget_events TO service_role;
