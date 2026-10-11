-- Add import_price to products table
-- Used to pre-populate cost_produs in ROAS calculator
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS import_price DECIMAL(10,2) NULL;

COMMENT ON COLUMN products.import_price IS 'Purchase/import price per unit (RON). Used to pre-populate cost in ROAS calculator.';
