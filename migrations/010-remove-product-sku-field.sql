-- Remove redundant product_sku field (cleanup from migration 009)
-- We already have main_sku which is populated automatically from the selected product

ALTER TABLE landing_pages DROP COLUMN IF EXISTS product_sku;

-- Note: We use main_sku instead (already exists, auto-populated from product selection)
-- The quantities (quantity_offer_1, quantity_offer_2, quantity_offer_3) remain and work correctly
