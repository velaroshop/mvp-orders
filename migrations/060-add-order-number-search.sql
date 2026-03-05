-- Migration 060: Add order_number search to search_orders RPC
-- Allows searching orders by order number (e.g. "01234" or "VEL-01234")

DROP FUNCTION IF EXISTS search_orders(UUID, TEXT, TEXT[], TIMESTAMPTZ, INT, INT, TEXT[]);

CREATE OR REPLACE FUNCTION search_orders(
  p_organization_id UUID,
  p_search_query TEXT,
  p_statuses TEXT[] DEFAULT NULL,
  p_date_cutoff TIMESTAMPTZ DEFAULT NULL,
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0,
  p_product_skus TEXT[] DEFAULT NULL
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
  call_status TEXT,
  call_attempts INT,
  last_call_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  confirmer_name TEXT,
  total_count BIGINT
) AS $$
DECLARE
  v_normalized_query TEXT;
  v_order_number INT;
BEGIN
  -- Normalize search query (remove diacritics)
  v_normalized_query := immutable_unaccent(lower(p_search_query));

  -- Extract digits from search query for order_number matching (e.g. "VEL-01234" -> 1234)
  v_order_number := NULL;
  IF p_search_query IS NOT NULL AND p_search_query != '' THEN
    BEGIN
      v_order_number := regexp_replace(p_search_query, '\D', '', 'g')::INT;
    EXCEPTION WHEN OTHERS THEN
      v_order_number := NULL;
    END;
  END IF;

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
      AND (p_product_skus IS NULL OR (
        o.product_sku = ANY(p_product_skus)
        OR EXISTS (
          SELECT 1 FROM jsonb_array_elements(o.upsells) AS elem
          WHERE elem->>'productSku' = ANY(p_product_skus)
        )
      ))
      AND (
        p_search_query = ''
        OR p_search_query IS NULL
        OR (v_order_number IS NOT NULL AND o.order_number = v_order_number)
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
    fo.call_status::TEXT,
    fo.call_attempts,
    fo.last_call_at::TIMESTAMPTZ,
    fo.created_at::TIMESTAMPTZ,
    fo.confirmer_name::TEXT,
    fo.total_count
  FROM filtered_orders fo;
END;
$$ LANGUAGE plpgsql STABLE;

ALTER FUNCTION public.search_orders(UUID, TEXT, TEXT[], TIMESTAMPTZ, INT, INT, TEXT[]) SET search_path = public;
