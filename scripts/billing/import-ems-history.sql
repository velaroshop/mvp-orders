-- One-off import: the 4 EMS invoices already issued in SmartBill (all paid), so Billing starts with clean history.
-- Run after migration 110. Safe to run twice: invoices already imported are skipped.
-- Organizations are matched by CUI (digits only) or by name; the script stops if either matches anything other than exactly one organization.
--   REDUXIO     CUI 52222727  EMS0002 and EMS0004, 1.000,00 lei each (plan ULTRA)
--   RIB MARKET  CUI 55243279  EMS0001 and EMS0003,   550,00 lei each (plan PRO)
-- SmartBill does not give payment dates; all four were paid on the day they were issued, so paid_at = issued_at.

BEGIN;

DO $$
DECLARE
  reduxio_count integer;
  rib_count integer;
BEGIN
  SELECT count(*) INTO reduxio_count FROM organizations
   WHERE regexp_replace(coalesce(cui, ''), '\D', '', 'g') = '52222727' OR name ILIKE '%reduxio%';
  SELECT count(*) INTO rib_count FROM organizations
   WHERE regexp_replace(coalesce(cui, ''), '\D', '', 'g') = '55243279' OR name ILIKE '%rib market%';

  IF reduxio_count <> 1 THEN
    RAISE EXCEPTION 'REDUXIO: found % organizations, expected exactly 1', reduxio_count;
  END IF;
  IF rib_count <> 1 THEN
    RAISE EXCEPTION 'RIB MARKET: found % organizations, expected exactly 1', rib_count;
  END IF;
END $$;

WITH invoices (org, series, number, period_start, period_end, amount, issued_at, due_date) AS (
  VALUES
    ('reduxio', 'EMS', '0002', DATE '2026-09-10', DATE '2026-10-09', 1000.00, DATE '2026-10-09', DATE '2026-10-24'),
    ('reduxio', 'EMS', '0004', DATE '2026-10-10', DATE '2026-11-09', 1000.00, DATE '2026-11-09', DATE '2026-11-24'),
    ('rib',     'EMS', '0001', DATE '2026-09-10', DATE '2026-10-09',  550.00, DATE '2026-10-09', DATE '2026-10-24'),
    ('rib',     'EMS', '0003', DATE '2026-10-10', DATE '2026-11-09',  550.00, DATE '2026-11-09', DATE '2026-11-24')
),
orgs AS (
  SELECT 'reduxio' AS org, id FROM organizations
   WHERE regexp_replace(coalesce(cui, ''), '\D', '', 'g') = '52222727' OR name ILIKE '%reduxio%'
  UNION ALL
  SELECT 'rib' AS org, id FROM organizations
   WHERE regexp_replace(coalesce(cui, ''), '\D', '', 'g') = '55243279' OR name ILIKE '%rib market%'
)
INSERT INTO billing_invoices
  (organization_id, series, number, period_start, period_end, amount, currency, issued_at, due_date,
   status, paid_at, paid_method, source, external_id, note)
SELECT o.id, v.series, v.number, v.period_start, v.period_end, v.amount, 'RON', v.issued_at, v.due_date,
       'paid', v.issued_at, NULL, 'smartbill', v.series || v.number, 'Import din SmartBill'
FROM invoices v
JOIN orgs o ON o.org = v.org
WHERE NOT EXISTS (
  SELECT 1 FROM billing_invoices b
   WHERE b.organization_id = o.id AND b.series = v.series AND b.number = v.number
);

-- Check: should list 4 rows
SELECT o.name, b.series || b.number AS invoice, b.period_start, b.period_end, b.amount, b.status
  FROM billing_invoices b
  JOIN organizations o ON o.id = b.organization_id
 WHERE b.series = 'EMS'
 ORDER BY b.number;

COMMIT;
