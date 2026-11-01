-- Migration 093: Library of legal pages (terms, privacy, returns...) per organization.
-- The same text is served on every domain of the organization at /<slug> (host routing comes later;
-- until then they can be seen at /legal/<organization slug>/<slug>). Same block model as landing_page_content.
-- Nothing existing is touched.

CREATE TABLE IF NOT EXISTS legal_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  slug text NOT NULL,
  title text NOT NULL DEFAULT '',
  background text,
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT legal_pages_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9-]{0,79}$')
);

-- The slug is unique inside an organization (every organization has its own set)
CREATE UNIQUE INDEX IF NOT EXISTS idx_legal_pages_org_slug ON legal_pages (organization_id, slug);

-- Grants required for new tables (Supabase Data API); RLS on with no policies = no direct access from anon/authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON public.legal_pages TO service_role;
GRANT SELECT ON public.legal_pages TO authenticated;
ALTER TABLE public.legal_pages ENABLE ROW LEVEL SECURITY;
