-- Populate product fields for existing orders
-- This migration fills product_name, product_sku, and product_quantity
-- for orders that were created before these columns existed

-- Update existing orders with product information from their landing pages
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

-- Log the number of updated orders
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % orders with product information', updated_count;
END $$;
