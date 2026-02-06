-- Add sync_error_message column to store the error reason when sync fails
-- This allows displaying the error in the admin UI for debugging

ALTER TABLE orders ADD COLUMN IF NOT EXISTS sync_error_message TEXT;

COMMENT ON COLUMN orders.sync_error_message IS 'Error message when order sync to Helpship fails (status = sync_error)';

-- Update RPC function to include sync_error_message in results
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
  sync_error_message TEXT,
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
    fo.landing_key::TEXT,
    fo.offer_code::TEXT,
    fo.phone::TEXT,
    fo.full_name::TEXT,
    fo.county::TEXT,
    fo.city::TEXT,
    fo.address::TEXT,
    fo.postal_code::TEXT,
    fo.product_name::TEXT,
    fo.product_sku::TEXT,
    fo.product_quantity,
    fo.upsells,
    fo.subtotal,
    fo.shipping_cost,
    fo.total,
    fo.status::TEXT,
    fo.helpship_order_id::TEXT,
    fo.order_number,
    fo.order_series::TEXT,
    fo.order_note::TEXT,
    fo.hold_from_status::TEXT,
    fo.from_partial_id,
    fo.source::TEXT,
    fo.queue_expires_at::TIMESTAMPTZ,
    fo.promoted_from_testing,
    fo.confirmed_by,
    fo.canceller_name::TEXT,
    fo.cancelled_note::TEXT,
    fo.scheduled_date,
    fo.fbclid::TEXT,
    fo.fbc::TEXT,
    fo.gclid::TEXT,
    fo.ttclid::TEXT,
    fo.utm_campaign::TEXT,
    fo.tracking_data,
    fo.landing_url::TEXT,
    fo.event_source_url::TEXT,
    fo.meta_purchase_status::TEXT,
    fo.meta_purchase_event_id::TEXT,
    fo.meta_purchase_sent_at::TIMESTAMPTZ,
    fo.meta_purchase_last_error::TEXT,
    fo.tracking_status::TEXT,
    fo.tracking_updated_at::TIMESTAMPTZ,
    fo.sync_error_message::TEXT,
    fo.created_at::TIMESTAMPTZ,
    fo.confirmer_name::TEXT,
    fo.total_count
  FROM filtered_orders fo;
END;
$$ LANGUAGE plpgsql STABLE;
