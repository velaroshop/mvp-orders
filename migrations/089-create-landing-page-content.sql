-- Migration 089: Content pages built from blocks (own landing pages served at /p/[slug])
-- A page is an ordered list of blocks stored as JSON. Optionally linked to an existing landing_pages
-- row (the order configuration). Nothing existing is touched; pages stay 'draft' (not served) until published.

CREATE TABLE IF NOT EXISTS landing_page_content (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  landing_page_id uuid REFERENCES landing_pages(id) ON DELETE SET NULL,
  slug text NOT NULL,
  title text NOT NULL DEFAULT '',
  background text,
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT landing_page_content_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9-]{0,79}$')
);

-- The public address /p/[slug] is global, so the slug is unique across organizations
CREATE UNIQUE INDEX IF NOT EXISTS idx_landing_page_content_slug ON landing_page_content (slug);
CREATE INDEX IF NOT EXISTS idx_landing_page_content_org ON landing_page_content (organization_id);

-- Grants required for new tables (Supabase Data API); RLS on with no policies = no direct access from anon/authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON public.landing_page_content TO service_role;
GRANT SELECT ON public.landing_page_content TO authenticated;
ALTER TABLE public.landing_page_content ENABLE ROW LEVEL SECURITY;
