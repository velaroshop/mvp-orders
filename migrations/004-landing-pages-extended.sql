-- Extend landing_pages table with all required fields

-- Add product_id and store_id (required)
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE RESTRICT;
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE RESTRICT;

-- Add thank you path (required, URL relativ)
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS thank_you_path TEXT NOT NULL DEFAULT 'thank-you';

-- Offer Settings
-- main_sku va fi populat automat din product, nu mai e câmp separat
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS offer_heading_1 TEXT NOT NULL DEFAULT 'Ieftin';
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS offer_heading_2 TEXT NOT NULL DEFAULT 'Avantajos';
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS offer_heading_3 TEXT NOT NULL DEFAULT 'Super ofertă';
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS numeral_1 TEXT NOT NULL DEFAULT '1 bucată';
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS numeral_2 TEXT NOT NULL DEFAULT 'Două bucăți';
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS numeral_3 TEXT NOT NULL DEFAULT 'Trei bucăți';
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS order_button_text TEXT NOT NULL DEFAULT 'Plasează comanda!';

-- Pricing & Shipping (all required)
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS srp DECIMAL(10, 2); -- Suggested Retail Price
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS price_1 DECIMAL(10, 2); -- Price for offer 1
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS price_2 DECIMAL(10, 2); -- Price for offer 2
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS price_3 DECIMAL(10, 2); -- Price for offer 3
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS shipping_price DECIMAL(10, 2);
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS post_purchase_status BOOLEAN DEFAULT false; -- Inactiv momentan

-- Conversion Tracking (optional, fără logică momentan)
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS fb_pixel_id TEXT;
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS fb_conversion_token TEXT;
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS client_side_tracking BOOLEAN DEFAULT false;
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS server_side_tracking BOOLEAN DEFAULT false;
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS custom_event_name TEXT;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_landing_pages_product_id ON landing_pages(product_id);
CREATE INDEX IF NOT EXISTS idx_landing_pages_store_id ON landing_pages(store_id);

-- Add NOT NULL constraints for required fields
-- Note: Run these only if you don't have existing data, or update existing rows first
-- ALTER TABLE landing_pages ALTER COLUMN product_id SET NOT NULL;
-- ALTER TABLE landing_pages ALTER COLUMN store_id SET NOT NULL;
-- ALTER TABLE landing_pages ALTER COLUMN thank_you_path SET NOT NULL;
-- ALTER TABLE landing_pages ALTER COLUMN offer_heading_1 SET NOT NULL;
-- ALTER TABLE landing_pages ALTER COLUMN offer_heading_2 SET NOT NULL;
-- ALTER TABLE landing_pages ALTER COLUMN offer_heading_3 SET NOT NULL;
-- ALTER TABLE landing_pages ALTER COLUMN numeral_1 SET NOT NULL;
-- ALTER TABLE landing_pages ALTER COLUMN numeral_2 SET NOT NULL;
-- ALTER TABLE landing_pages ALTER COLUMN numeral_3 SET NOT NULL;
-- ALTER TABLE landing_pages ALTER COLUMN order_button_text SET NOT NULL;
-- ALTER TABLE landing_pages ALTER COLUMN srp SET NOT NULL;
-- ALTER TABLE landing_pages ALTER COLUMN price_1 SET NOT NULL;
-- ALTER TABLE landing_pages ALTER COLUMN price_2 SET NOT NULL;
-- ALTER TABLE landing_pages ALTER COLUMN price_3 SET NOT NULL;
-- ALTER TABLE landing_pages ALTER COLUMN shipping_price SET NOT NULL;
