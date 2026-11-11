-- New products default to single variant selection (customer picks one variant,
-- all units of the offer go to it). Existing products keep their stored value.
-- Multi selection stays available per product from the product edit page.

ALTER TABLE products
  ALTER COLUMN variation_selection_mode SET DEFAULT 'single';
