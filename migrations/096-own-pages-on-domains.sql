-- Migration 096: own pages can live on a custom domain (comanda.client.ro/slug).
-- - landing_page_content.domain_id: the domain the page is served on. NULL = the application domain (/p/slug), as before.
-- - The slug was unique across the whole system; now it is unique per domain (and still unique among pages with no domain).
-- - page_domains.root_redirect: where the bare address of a domain (comanda.client.ro/) goes, for example the main site.
-- Existing pages keep working unchanged (domain_id stays NULL).

BEGIN;

ALTER TABLE landing_page_content ADD COLUMN IF NOT EXISTS domain_id uuid REFERENCES page_domains(id) ON DELETE SET NULL;

DROP INDEX IF EXISTS idx_landing_page_content_slug;
CREATE UNIQUE INDEX IF NOT EXISTS idx_landing_page_content_slug_nodomain ON landing_page_content (slug) WHERE domain_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_landing_page_content_domain_slug ON landing_page_content (domain_id, slug) WHERE domain_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_landing_page_content_domain ON landing_page_content (domain_id);

ALTER TABLE page_domains ADD COLUMN IF NOT EXISTS root_redirect text;

COMMIT;
