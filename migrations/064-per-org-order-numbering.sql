-- Migration: Per-organization order numbering
-- Previously order_number used a global sequence shared across all organizations.
-- Now each organization gets independent numbering starting from 1.
-- Existing orders (Velaro) are NOT affected — their numbers remain unchanged.

-- Replace the trigger function to use MAX per organization instead of global sequence
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  IF NEW.order_number IS NULL THEN
    SELECT COALESCE(MAX(order_number), 0) + 1
    INTO next_num
    FROM orders
    WHERE organization_id = NEW.organization_id;

    NEW.order_number := next_num;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add unique constraint to prevent duplicate order numbers within an organization
-- (safety net for concurrent inserts)
ALTER TABLE orders
  ADD CONSTRAINT unique_org_order_number UNIQUE (organization_id, order_number);
