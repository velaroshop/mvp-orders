-- Migration 099: homepage per domain and page width for own pages.
-- - landing_page_content.is_home: the page served at the bare address of its domain (domain/). One per domain.
-- - landing_page_content.layout: "narrow" (phone-style column, 560 px, as every page so far) or "wide" (up to 1200 px,
--   for homepages with a product grid). Existing pages stay narrow.
-- Nothing else is touched.

ALTER TABLE landing_page_content ADD COLUMN IF NOT EXISTS is_home boolean NOT NULL DEFAULT false;
ALTER TABLE landing_page_content ADD COLUMN IF NOT EXISTS layout text NOT NULL DEFAULT 'narrow' CHECK (layout IN ('narrow', 'wide'));

-- At most one homepage per domain
CREATE UNIQUE INDEX IF NOT EXISTS idx_landing_page_content_one_home_per_domain ON landing_page_content (domain_id) WHERE is_home AND domain_id IS NOT NULL;
