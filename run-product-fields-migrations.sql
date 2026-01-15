-- Combined migration: Add product fields and populate existing orders
-- Run this in Supabase Dashboard -> SQL Editor

-- STEP 1: Add product fields to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_sku TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_quantity INTEGER DEFAULT 1;

COMMENT ON COLUMN orders.product_name IS 'Product name from products table';
COMMENT ON COLUMN orders.product_sku IS 'Product SKU sent to Helpship';
COMMENT ON COLUMN orders.product_quantity IS 'Product quantity based on offer code';

-- STEP 2: Populate product fields for existing orders
UPDATE orders o
SET
  product_name = p.name,
  product_sku = lp.main_sku,
  product_quantity = CASE
    WHEN o.offer_code = 'offer_1' THEN COALESCE(lp.quantity_offer_1, 1)
    WHEN o.offer_code = 'offer_2' THEN COALESCE(lp.quantity_offer_2, 2)
    WHEN o.offer_code = 'offer_3' THEN COALESCE(lp.quantity_offer_3, 3)
    ELSE 1
  END
FROM landing_pages lp
LEFT JOIN products p ON p.id = lp.product_id
WHERE o.landing_key = lp.slug
  AND (o.product_name IS NULL OR o.product_sku IS NULL OR o.product_quantity IS NULL);
