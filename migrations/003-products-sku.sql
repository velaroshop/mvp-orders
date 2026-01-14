-- Add SKU column to products table and update status constraint

-- Add SKU column
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku TEXT;

-- Update status constraint to allow 'active' and 'testing'
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_status_check;
ALTER TABLE products ADD CONSTRAINT products_status_check CHECK (status IN ('active', 'testing', 'inactive'));

-- Add index for SKU lookup
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(organization_id, sku);

-- Add unique constraint for SKU per organization (optional, but recommended)
-- Uncomment if you want SKU to be unique per organization
-- ALTER TABLE products ADD CONSTRAINT products_sku_org_unique UNIQUE(organization_id, sku);
