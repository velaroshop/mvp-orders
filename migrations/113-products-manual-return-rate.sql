-- Migration 113: optional manual return rate per product (percent, 0-100), used by the Break-even CPA calculation.
-- When set it replaces the return rate calculated from the orders of 30-120 days ago.

ALTER TABLE products ADD COLUMN IF NOT EXISTS manual_return_rate numeric(5,2) NULL;

COMMENT ON COLUMN products.manual_return_rate IS 'Manual return rate in percent (0-100). Replaces the calculated return rate in the Break-even CPA calculation when set.';

-- NOVALIFT (REDUXIO SRL): 18%
UPDATE products SET manual_return_rate = 18
WHERE name = 'NOVALIFT' AND organization_id = '26311df6-5e43-4bbf-87aa-1719a11de36f';
