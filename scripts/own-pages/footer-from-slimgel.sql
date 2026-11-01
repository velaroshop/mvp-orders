-- Creează primul footer din biblioteca de footere, copiind footerul paginii slimgel-test, și îl face implicit.
-- Rulează-l o singură dată, după migrarea 092. Nu modifică pagina slimgel-test.
insert into page_footers (organization_id, name, block, is_default)
select
  p.organization_id,
  'REDUXIO',
  (select b from jsonb_array_elements(p.blocks) b where b->>'type' = 'footer' limit 1),
  true
from landing_page_content p
where p.slug = 'slimgel-test'
  and exists (select 1 from jsonb_array_elements(p.blocks) b where b->>'type' = 'footer')
  and not exists (select 1 from page_footers f where f.organization_id = p.organization_id);
