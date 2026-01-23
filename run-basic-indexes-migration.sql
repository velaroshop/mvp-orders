-- Basic performance indexes for orders and partial_orders tables
-- Run this in Supabase Dashboard -> SQL Editor
-- This is the simplified version WITHOUT trigram indexes (no extension required)

-- =========================================
-- ORDERS TABLE INDEXES
-- =========================================

-- Index for listing orders by organization with status filter (most common query)
CREATE INDEX IF NOT EXISTS idx_orders_org_status
  ON orders(organization_id, status);

-- Index for listing orders by organization sorted by created_at (default sort)
CREATE INDEX IF NOT EXISTS idx_orders_org_created_at
  ON orders(organization_id, created_at DESC);

-- Composite index for status filtering + date sorting (most optimized for list query)
CREATE INDEX IF NOT EXISTS idx_orders_org_status_created_at
  ON orders(organization_id, status, created_at DESC);

-- Index for phone lookups (exact match and prefix search)
CREATE INDEX IF NOT EXISTS idx_orders_org_phone
  ON orders(organization_id, phone);

-- Index for scheduled orders
CREATE INDEX IF NOT EXISTS idx_orders_scheduled_date
  ON orders(scheduled_date)
  WHERE scheduled_date IS NOT NULL;

-- Index for Helpship order ID lookups
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

-- Index for landing_key lookups
CREATE INDEX IF NOT EXISTS idx_partial_orders_landing_key
  ON partial_orders(organization_id, landing_key);

-- =========================================
-- VERIFY INDEXES WERE CREATED
-- =========================================

-- Run this to see all indexes:
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename IN ('orders', 'partial_orders') ORDER BY tablename, indexname;
