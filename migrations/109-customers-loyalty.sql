-- Migration 109: loyal customers ("Clienți fideli")
-- A customer is loyal when they have at least 3 delivered orders (tracking_status = 'Delivered')
-- and the return rate returned / (delivered + returned) is at most 25%.
-- loyal_override: true = marked loyal by hand, false = removed from loyal by hand, NULL = automatic rule.
-- A blacklisted customer is never loyal. Existing customers are backfilled below.

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS is_loyal BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS loyal_since TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS loyal_override BOOLEAN,
  ADD COLUMN IF NOT EXISTS delivered_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS returned_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_customers_loyal
  ON customers(organization_id) WHERE is_loyal = true;

-- Backfill from the order history
WITH counts AS (
  SELECT
    o.customer_id,
    count(*) FILTER (WHERE o.tracking_status = 'Delivered')                AS delivered,
    count(*) FILTER (WHERE o.tracking_status IN ('Returned', 'Returning')) AS returned
  FROM orders o
  WHERE o.customer_id IS NOT NULL AND o.status <> 'testing'
  GROUP BY o.customer_id
),
verdict AS (
  SELECT
    cu.id,
    c.delivered,
    c.returned,
    CASE
      WHEN cu.is_blacklisted OR c.delivered < 3 THEN false
      ELSE c.returned::numeric / (c.delivered + c.returned) <= 0.25
    END AS loyal
  FROM customers cu
  JOIN counts c ON c.customer_id = cu.id
)
UPDATE customers cu
SET delivered_count = v.delivered,
    returned_count  = v.returned,
    is_loyal        = v.loyal,
    loyal_since     = CASE WHEN v.loyal THEN now() ELSE NULL END
FROM verdict v
WHERE v.id = cu.id;
