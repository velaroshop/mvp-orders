-- Add variation_selection_mode to products table
-- 'multi'  = customer distributes units across variants (existing behavior)
-- 'single' = customer picks one variant and gets all units of the chosen offer

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS variation_selection_mode TEXT NOT NULL DEFAULT 'multi'
  CHECK (variation_selection_mode IN ('multi', 'single'));
