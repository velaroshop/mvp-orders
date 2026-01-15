-- Add SKU fields for each offer to landing_pages table
-- These SKUs will be sent to Helpship when creating orders

ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS sku_offer_1 TEXT;
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS sku_offer_2 TEXT;
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS sku_offer_3 TEXT;

COMMENT ON COLUMN landing_pages.sku_offer_1 IS 'SKU for offer 1 (to be sent to Helpship)';
COMMENT ON COLUMN landing_pages.sku_offer_2 IS 'SKU for offer 2 (to be sent to Helpship)';
COMMENT ON COLUMN landing_pages.sku_offer_3 IS 'SKU for offer 3 (to be sent to Helpship)';
