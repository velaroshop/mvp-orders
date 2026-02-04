-- Enable unaccent extension for diacritics-insensitive search
-- This allows searching "BARBULESCU" to match "BĂRBULESCU"

CREATE EXTENSION IF NOT EXISTS unaccent;

-- Create an immutable wrapper function for unaccent (needed for indexes)
CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text AS $$
  SELECT public.unaccent($1)
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE;

-- Create indexes for faster diacritics-insensitive search on orders
CREATE INDEX IF NOT EXISTS idx_orders_full_name_unaccent
ON orders (immutable_unaccent(lower(full_name)));

CREATE INDEX IF NOT EXISTS idx_orders_county_unaccent
ON orders (immutable_unaccent(lower(county)));

CREATE INDEX IF NOT EXISTS idx_orders_city_unaccent
ON orders (immutable_unaccent(lower(city)));

CREATE INDEX IF NOT EXISTS idx_orders_address_unaccent
ON orders (immutable_unaccent(lower(address)));

COMMENT ON FUNCTION immutable_unaccent(text) IS 'Immutable wrapper for unaccent() to enable use in indexes';

-- Create RPC function for searching orders with diacritics-insensitive matching
CREATE OR REPLACE FUNCTION search_orders(
  p_organization_id UUID,
  p_search_query TEXT,
  p_statuses TEXT[] DEFAULT NULL,
  p_date_cutoff TIMESTAMPTZ DEFAULT NULL,
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  customer_id UUID,
  organization_id UUID,
  landing_key TEXT,
  offer_code TEXT,
  phone TEXT,
  full_name TEXT,
  county TEXT,
  city TEXT,
  address TEXT,
  postal_code TEXT,
  product_name TEXT,
  product_sku TEXT,
  product_quantity INT,
  upsells JSONB,
  subtotal NUMERIC,
  shipping_cost NUMERIC,
  total NUMERIC,
  status TEXT,
  helpship_order_id TEXT,
  order_number INT,
  order_series TEXT,
  order_note TEXT,
  hold_from_status TEXT,
  from_partial_id UUID,
  source TEXT,
  queue_expires_at TIMESTAMPTZ,
  promoted_from_testing BOOLEAN,
  confirmed_by UUID,
  canceller_name TEXT,
  cancelled_note TEXT,
  scheduled_date DATE,
  fbclid TEXT,
  fbc TEXT,
  gclid TEXT,
  ttclid TEXT,
  utm_campaign TEXT,
  tracking_data JSONB,
  landing_url TEXT,
  event_source_url TEXT,
  meta_purchase_status TEXT,
  meta_purchase_event_id TEXT,
  meta_purchase_sent_at TIMESTAMPTZ,
  meta_purchase_last_error TEXT,
  tracking_status TEXT,
  tracking_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  confirmer_name TEXT,
  total_count BIGINT
) AS $$
DECLARE
  v_normalized_query TEXT;
BEGIN
  -- Normalize search query (remove diacritics)
  v_normalized_query := immutable_unaccent(lower(p_search_query));

  RETURN QUERY
  WITH filtered_orders AS (
    SELECT
      o.*,
      u.name as confirmer_name,
      COUNT(*) OVER() as total_count
    FROM orders o
    LEFT JOIN users u ON o.confirmed_by = u.id
    WHERE o.organization_id = p_organization_id
      AND (p_statuses IS NULL OR o.status = ANY(p_statuses))
      AND (p_date_cutoff IS NULL OR o.created_at >= p_date_cutoff)
      AND (
        p_search_query = ''
        OR p_search_query IS NULL
        OR o.phone ILIKE '%' || p_search_query || '%'
        OR immutable_unaccent(lower(o.full_name)) ILIKE '%' || v_normalized_query || '%'
        OR immutable_unaccent(lower(o.county)) ILIKE '%' || v_normalized_query || '%'
        OR immutable_unaccent(lower(o.city)) ILIKE '%' || v_normalized_query || '%'
        OR immutable_unaccent(lower(o.address)) ILIKE '%' || v_normalized_query || '%'
      )
    ORDER BY o.created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  )
  SELECT
    fo.id,
    fo.customer_id,
    fo.organization_id,
    fo.landing_key,
    fo.offer_code,
    fo.phone,
    fo.full_name,
    fo.county,
    fo.city,
    fo.address,
    fo.postal_code,
    fo.product_name,
    fo.product_sku,
    fo.product_quantity,
    fo.upsells,
    fo.subtotal,
    fo.shipping_cost,
    fo.total,
    fo.status,
    fo.helpship_order_id,
    fo.order_number,
    fo.order_series,
    fo.order_note,
    fo.hold_from_status,
    fo.from_partial_id,
    fo.source,
    fo.queue_expires_at,
    fo.promoted_from_testing,
    fo.confirmed_by,
    fo.canceller_name,
    fo.cancelled_note,
    fo.scheduled_date,
    fo.fbclid,
    fo.fbc,
    fo.gclid,
    fo.ttclid,
    fo.utm_campaign,
    fo.tracking_data,
    fo.landing_url,
    fo.event_source_url,
    fo.meta_purchase_status,
    fo.meta_purchase_event_id,
    fo.meta_purchase_sent_at,
    fo.meta_purchase_last_error,
    fo.tracking_status,
    fo.tracking_updated_at,
    fo.created_at,
    fo.confirmer_name,
    fo.total_count
  FROM filtered_orders fo;
END;
$$ LANGUAGE plpgsql STABLE;
