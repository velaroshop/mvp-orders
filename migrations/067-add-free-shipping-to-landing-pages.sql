-- Migration 067: Add free shipping per offer to landing pages
-- Allows configuring free shipping independently for each offer (1, 2, 3).
-- Existing landing pages are NOT affected (all default to false).

ALTER TABLE landing_pages
  ADD COLUMN IF NOT EXISTS free_shipping_offer_1 BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS free_shipping_offer_2 BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS free_shipping_offer_3 BOOLEAN NOT NULL DEFAULT false;
