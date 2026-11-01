-- Migration 092: Library of footers for own pages (/p/[slug] and /thank-you), per organization.
-- A page uses one through the "shared_footer" block (by id, or the organization's default footer).
-- The footer content is a "footer" block (same fields as the per-page footer block).
-- Nothing existing is touched.

CREATE TABLE IF NOT EXISTS page_footers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  block jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_page_footers_org ON page_footers (organization_id);
-- At most one default footer per organization
CREATE UNIQUE INDEX IF NOT EXISTS idx_page_footers_one_default ON page_footers (organization_id) WHERE is_default;

-- Grants required for new tables (Supabase Data API); RLS on with no policies = no direct access from anon/authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON public.page_footers TO service_role;
GRANT SELECT ON public.page_footers TO authenticated;
ALTER TABLE public.page_footers ENABLE ROW LEVEL SECURITY;
