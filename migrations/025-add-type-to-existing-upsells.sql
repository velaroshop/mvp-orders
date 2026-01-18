-- Migration 025: Add type field to existing upsells
-- Date: 2026-01-18
-- Description: Update existing upsells to add type field (presale/postsale)

-- This migration adds the "type" field to upsells that don't have it yet.
-- Strategy:
-- 1. For orders with only 1 upsell → mark as "presale"
-- 2. For orders with multiple upsells:
--    - First upsells → mark as "presale"
--    - Last upsell (if added later) → mark as "postsale"

-- Note: This is a data migration script to fix historical data.
-- New orders will have the type field set automatically.

-- Function to update upsells with type field
CREATE OR REPLACE FUNCTION add_type_to_upsells()
RETURNS void AS $$
DECLARE
  order_record RECORD;
  updated_upsells JSONB;
  upsell JSONB;
  upsell_array JSONB[];
  i INTEGER;
BEGIN
  -- Loop through all orders that have upsells
  FOR order_record IN
    SELECT id, upsells
    FROM orders
    WHERE upsells IS NOT NULL
      AND jsonb_array_length(upsells) > 0
  LOOP
    updated_upsells := '[]'::jsonb;

    -- Convert JSONB array to array of JSONB objects
    FOR i IN 0..(jsonb_array_length(order_record.upsells) - 1) LOOP
      upsell := order_record.upsells->i;

      -- Only add type if it doesn't exist
      IF NOT (upsell ? 'type') THEN
        -- Default to presale (most upsells are presale)
        -- Last upsell in array might be postsale, but we can't reliably detect this
        -- So we mark all as presale for safety
        upsell := upsell || jsonb_build_object('type', 'presale');
      END IF;

      updated_upsells := updated_upsells || jsonb_build_array(upsell);
    END LOOP;

    -- Update the order with the modified upsells
    UPDATE orders
    SET upsells = updated_upsells,
        updated_at = NOW()
    WHERE id = order_record.id;

    RAISE NOTICE 'Updated order %: % upsells', order_record.id, jsonb_array_length(updated_upsells);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the function
SELECT add_type_to_upsells();

-- Drop the function after use
DROP FUNCTION add_type_to_upsells();

-- Verification query (run this after migration to check results)
-- SELECT id, jsonb_array_length(upsells) as upsell_count, upsells
-- FROM orders
-- WHERE upsells IS NOT NULL AND jsonb_array_length(upsells) > 0
-- LIMIT 10;
