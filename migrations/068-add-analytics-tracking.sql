-- Migration 068: Add analytics tracking support
-- Per-landing-page toggle + sessions table for visitor behavior data

-- Toggle on landing pages (superadmin activates per LP)
ALTER TABLE landing_pages
  ADD COLUMN IF NOT EXISTS analytics_tracking BOOLEAN NOT NULL DEFAULT false;

-- Sessions table — one row per visitor session with rich JSONB summary
CREATE TABLE IF NOT EXISTS analytics_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  landing_page_id UUID NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,

  -- Device info
  device TEXT,
  browser TEXT,
  screen_size TEXT,
  referrer TEXT,

  -- Landing page interactions (from embed.js)
  time_on_page INTEGER,
  scroll_max INTEGER,
  scroll_to_form BOOLEAN DEFAULT false,
  clicks_on_page INTEGER DEFAULT 0,

  -- Form interactions (from widget)
  form_started BOOLEAN DEFAULT false,
  fields_completed TEXT[] DEFAULT '{}',
  field_abandoned_at TEXT,
  time_per_field JSONB DEFAULT '{}',
  validation_errors TEXT[] DEFAULT '{}',
  offer_selected TEXT,
  offer_changes TEXT[] DEFAULT '{}',
  upsells_viewed INTEGER DEFAULT 0,
  upsells_selected TEXT[] DEFAULT '{}',
  upsells_deselected TEXT[] DEFAULT '{}',

  -- Outcome
  outcome TEXT NOT NULL DEFAULT 'abandoned',
  order_id UUID,
  total_value NUMERIC(10, 2),

  -- Postsale
  postsale_shown BOOLEAN DEFAULT false,
  postsale_accepted BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for querying
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_org
  ON analytics_sessions(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_sessions_lp
  ON analytics_sessions(landing_page_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_sessions_session
  ON analytics_sessions(session_id);

-- Enable RLS
ALTER TABLE analytics_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policy: org members can access their org's sessions
CREATE POLICY "analytics_sessions_org_access" ON analytics_sessions
  FOR ALL USING (
    organization_id IN (
      SELECT om.organization_id FROM organization_members om
      WHERE om.user_id = auth.uid() AND om.is_active = true
    )
  );

-- Service role bypass (for API inserts from public endpoint)
GRANT SELECT, INSERT, UPDATE, DELETE ON analytics_sessions TO service_role;
