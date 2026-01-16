-- Add price fields for each offer in landing pages
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS price_offer_1 DECIMAL(10, 2);
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS price_offer_2 DECIMAL(10, 2);
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS price_offer_3 DECIMAL(10, 2);

COMMENT ON COLUMN landing_pages.price_offer_1 IS 'Price for offer 1 (e.g., 99.99 RON)';
COMMENT ON COLUMN landing_pages.price_offer_2 IS 'Price for offer 2 (e.g., 179.99 RON)';
COMMENT ON COLUMN landing_pages.price_offer_3 IS 'Price for offer 3 (e.g., 249.99 RON)';
