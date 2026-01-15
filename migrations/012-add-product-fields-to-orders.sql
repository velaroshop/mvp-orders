-- Add product fields to orders table
-- These fields store the product information for each order

ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_sku TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_quantity INTEGER DEFAULT 1;

COMMENT ON COLUMN orders.product_name IS 'Product name from products table';
COMMENT ON COLUMN orders.product_sku IS 'Product SKU sent to Helpship';
COMMENT ON COLUMN orders.product_quantity IS 'Product quantity based on offer code';
