-- Migration 094: Custom domains of an organization for its own pages (comanda.client.ro, ...).
-- A domain is first "pending": the owner proves control of it with a TXT record (_velaro-verify.<hostname>).
-- Only then it becomes "verified" (and later "active", once connected to the hosting provider).
-- The same hostname may be pending in several organizations (nobody can block the real owner by adding it first),
-- but only one organization can hold it as verified/active.
-- Nothing existing is touched.

CREATE TABLE IF NOT EXISTS page_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  hostname text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'active')),
  verification_token text NOT NULL,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT page_domains_hostname_format CHECK (hostname = lower(hostname) AND length(hostname) <= 253)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_page_domains_org_hostname ON page_domains (organization_id, hostname);
CREATE UNIQUE INDEX IF NOT EXISTS idx_page_domains_hostname_verified ON page_domains (hostname) WHERE status <> 'pending';
CREATE INDEX IF NOT EXISTS idx_page_domains_org ON page_domains (organization_id);

-- Grants required for new tables (Supabase Data API); RLS on with no policies = no direct access from anon/authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON public.page_domains TO service_role;
GRANT SELECT ON public.page_domains TO authenticated;
ALTER TABLE public.page_domains ENABLE ROW LEVEL SECURITY;
