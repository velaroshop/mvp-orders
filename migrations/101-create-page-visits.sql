-- Migration 101: one row per visit on an own page (custom domains), for the statistics screen.
-- Anonymous: no name, phone, address or IP. session_id is a random id made in the visitor's browser for this one visit.
-- Written only by the tracker of the own pages (POST /api/page-visits); nothing existing is touched.

CREATE TABLE IF NOT EXISTS page_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  domain_id uuid REFERENCES page_domains(id) ON DELETE SET NULL,
  page_id uuid REFERENCES landing_page_content(id) ON DELETE SET NULL,
  slug text NOT NULL,
  session_id text NOT NULL,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  referrer_host text,
  device text,
  os text,
  browser text,
  in_app boolean NOT NULL DEFAULT false,
  screen_w integer,
  form_seen boolean NOT NULL DEFAULT false,
  max_scroll integer,
  time_s integer,
  fcp_ms integer,
  form_ms integer,
  js_errors integer NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_page_visits_session ON page_visits (session_id);
CREATE INDEX IF NOT EXISTS idx_page_visits_org_created ON page_visits (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_visits_page_created ON page_visits (page_id, created_at DESC);

-- Grants required for new tables (Supabase Data API); RLS on with no policies = no direct access from anon/authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON public.page_visits TO service_role;
GRANT SELECT ON public.page_visits TO authenticated;
ALTER TABLE public.page_visits ENABLE ROW LEVEL SECURITY;
