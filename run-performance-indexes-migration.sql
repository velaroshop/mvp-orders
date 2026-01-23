-- Performance indexes for orders and partial_orders tables
-- Run this in Supabase Dashboard -> SQL Editor
-- These indexes optimize the most common queries in the application

-- =========================================
-- ORDERS TABLE INDEXES
-- =========================================

-- Index for listing orders by organization with status filter (most common query)
-- Used by: /api/orders/list with status filter
CREATE INDEX IF NOT EXISTS idx_orders_org_status
  ON orders(organization_id, status);

-- Index for listing orders by organization sorted by created_at (default sort)
-- Used by: /api/orders/list with ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_orders_org_created_at
  ON orders(organization_id, created_at DESC);

-- Composite index for status filtering + date sorting (combines both common operations)
-- This is the most optimized index for the typical orders list query
CREATE INDEX IF NOT EXISTS idx_orders_org_status_created_at
  ON orders(organization_id, status, created_at DESC);

-- Index for phone search (ILIKE queries)
-- Used by: /api/orders/list search by phone
-- Note: For ILIKE with leading wildcard, consider pg_trgm extension for better performance
CREATE INDEX IF NOT EXISTS idx_orders_phone_trgm
  ON orders USING gin (phone gin_trgm_ops);

-- Index for full_name search (ILIKE queries)
-- Used by: /api/orders/list search by name
CREATE INDEX IF NOT EXISTS idx_orders_fullname_trgm
  ON orders USING gin (full_name gin_trgm_ops);

-- Index for city search
CREATE INDEX IF NOT EXISTS idx_orders_city_trgm
  ON orders USING gin (city gin_trgm_ops);

-- Index for county search
CREATE INDEX IF NOT EXISTS idx_orders_county_trgm
  ON orders USING gin (county gin_trgm_ops);

-- Index for address search
CREATE INDEX IF NOT EXISTS idx_orders_address_trgm
  ON orders USING gin (address gin_trgm_ops);

-- Index for scheduled orders (to quickly find orders scheduled for today)
-- Used by: potential scheduled order processing
CREATE INDEX IF NOT EXISTS idx_orders_scheduled_date
  ON orders(scheduled_date)
  WHERE scheduled_date IS NOT NULL;

-- Index for Helpship order ID lookups
-- Used by: order sync operations
CREATE INDEX IF NOT EXISTS idx_orders_helpship_order_id
  ON orders(helpship_order_id)
  WHERE helpship_order_id IS NOT NULL;

-- =========================================
-- PARTIAL_ORDERS TABLE INDEXES
-- =========================================

-- Index for listing partial orders by organization with status filter
CREATE INDEX IF NOT EXISTS idx_partial_orders_org_status
  ON partial_orders(organization_id, status);

-- Index for listing partial orders sorted by created_at
CREATE INDEX IF NOT EXISTS idx_partial_orders_org_created_at
  ON partial_orders(organization_id, created_at DESC);

-- Composite index for status + date sorting
CREATE INDEX IF NOT EXISTS idx_partial_orders_org_status_created_at
  ON partial_orders(organization_id, status, created_at DESC);

-- Index for phone search on partial orders
CREATE INDEX IF NOT EXISTS idx_partial_orders_phone_trgm
  ON partial_orders USING gin (phone gin_trgm_ops);

-- Index for landing_key lookups
CREATE INDEX IF NOT EXISTS idx_partial_orders_landing_key
  ON partial_orders(organization_id, landing_key);

-- =========================================
-- ENABLE pg_trgm EXTENSION (required for ILIKE indexes)
-- This must be run first if not already enabled
-- =========================================

-- Uncomment and run this first if you get errors about gin_trgm_ops:
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =========================================
-- VERIFY INDEXES WERE CREATED
-- =========================================

-- Run this to verify all indexes exist:
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename IN ('orders', 'partial_orders') ORDER BY tablename, indexname;
