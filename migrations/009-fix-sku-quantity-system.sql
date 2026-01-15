-- Fix SKU system: Use single SKU with different quantities per offer
-- Remove the 3 separate SKU fields and add 1 SKU field + 3 quantity fields

-- Remove old SKU fields (from migration 008)
ALTER TABLE landing_pages DROP COLUMN IF EXISTS sku_offer_1;
ALTER TABLE landing_pages DROP COLUMN IF EXISTS sku_offer_2;
ALTER TABLE landing_pages DROP COLUMN IF EXISTS sku_offer_3;

-- Add quantity fields for each offer (how many pieces in each offer)
-- Note: We use main_sku (already exists, auto-populated from product) for the SKU
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS quantity_offer_1 INTEGER DEFAULT 1;
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS quantity_offer_2 INTEGER DEFAULT 2;
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS quantity_offer_3 INTEGER DEFAULT 3;

COMMENT ON COLUMN landing_pages.quantity_offer_1 IS 'Quantity for offer 1 (e.g., 1 piece)';
COMMENT ON COLUMN landing_pages.quantity_offer_2 IS 'Quantity for offer 2 (e.g., 2 pieces)';
COMMENT ON COLUMN landing_pages.quantity_offer_3 IS 'Quantity for offer 3 (e.g., 3 pieces)';
