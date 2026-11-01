-- Mută cele 4 pagini legale importate din Shopify (create cu legal-pages.sql în lista paginilor de vânzare)
-- în biblioteca de pagini legale. Rulează-l o singură dată, după migrarea 093. Păstrează conținutul și starea
-- (ciornă/publicat); șterge din lista paginilor de vânzare doar rândurile care au fost copiate.
insert into legal_pages (organization_id, slug, title, background, blocks, status, created_at, updated_at)
select organization_id, slug, title, background, blocks, status, created_at, updated_at
from landing_page_content
where slug in ('termeni-si-conditii', 'politica-de-retur', 'retur-produse-cosmetice', 'politica-de-confidentialitate')
on conflict (organization_id, slug) do nothing;

delete from landing_page_content c
where c.slug in ('termeni-si-conditii', 'politica-de-retur', 'retur-produse-cosmetice', 'politica-de-confidentialitate')
  and exists (select 1 from legal_pages l where l.organization_id = c.organization_id and l.slug = c.slug);
