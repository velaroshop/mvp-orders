-- Migration 100: redirect rules per custom domain (old address -> new address), applied in front of the domain's pages.
-- Used when a site moves to the new system: for example /products/slimgel -> /slimgel, or /pages/* -> /*.
-- The rules only act on the custom domains of this system; nothing existing is touched.

CREATE TABLE IF NOT EXISTS domain_redirects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  domain_id uuid NOT NULL REFERENCES page_domains(id) ON DELETE CASCADE,
  from_path text NOT NULL,
  to_url text NOT NULL,
  status_code integer NOT NULL DEFAULT 302 CHECK (status_code IN (301, 302, 307, 308)),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_domain_redirects_domain_from ON domain_redirects (domain_id, from_path);
CREATE INDEX IF NOT EXISTS idx_domain_redirects_org ON domain_redirects (organization_id);

-- Grants required for new tables (Supabase Data API); RLS on with no policies = no direct access from anon/authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON public.domain_redirects TO service_role;
GRANT SELECT ON public.domain_redirects TO authenticated;
ALTER TABLE public.domain_redirects ENABLE ROW LEVEL SECURITY;
