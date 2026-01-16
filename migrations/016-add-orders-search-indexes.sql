-- Add indexes for orders search performance
-- These indexes will speed up ILIKE searches on text columns

-- Index on phone number (exact and partial matches)
CREATE INDEX IF NOT EXISTS idx_orders_phone_search ON orders(phone);

-- Index on full_name (case-insensitive search)
CREATE INDEX IF NOT EXISTS idx_orders_full_name_lower ON orders(LOWER(full_name));

-- Index on county (case-insensitive search)
CREATE INDEX IF NOT EXISTS idx_orders_county_lower ON orders(LOWER(county));

-- Index on city (case-insensitive search)
CREATE INDEX IF NOT EXISTS idx_orders_city_lower ON orders(LOWER(city));

-- Index on address (case-insensitive search)
CREATE INDEX IF NOT EXISTS idx_orders_address_lower ON orders(LOWER(address));

-- Composite index for organization + created_at (for pagination sorting)
CREATE INDEX IF NOT EXISTS idx_orders_org_created ON orders(organization_id, created_at DESC);

-- Comments
COMMENT ON INDEX idx_orders_phone_search IS 'Speeds up phone number searches';
COMMENT ON INDEX idx_orders_full_name_lower IS 'Speeds up case-insensitive name searches';
COMMENT ON INDEX idx_orders_county_lower IS 'Speeds up case-insensitive county searches';
COMMENT ON INDEX idx_orders_city_lower IS 'Speeds up case-insensitive city searches';
COMMENT ON INDEX idx_orders_address_lower IS 'Speeds up case-insensitive address searches';
COMMENT ON INDEX idx_orders_org_created IS 'Speeds up paginated queries with organization filter and date sorting';
