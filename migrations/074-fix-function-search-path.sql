-- Migration: Fix function search_path mutable security warning
-- Sets explicit search_path on set_order_number() to prevent search_path injection attacks.

CREATE OR REPLACE FUNCTION public.set_order_number()
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
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public;
