-- Migration 070: Add retargeting fields to landing pages
-- form_variant = 10 for retargeting landing pages
-- Existing LPs are NOT affected (all fields are optional with defaults)

-- Retargeting-specific fields
ALTER TABLE landing_pages
  ADD COLUMN IF NOT EXISTS retarget_headline TEXT DEFAULT 'OFERTĂ EXCLUSIVĂ',
  ADD COLUMN IF NOT EXISTS retarget_subheadline TEXT DEFAULT 'Doar azi: ofertă specială!',
  ADD COLUMN IF NOT EXISTS retarget_quantity INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS retarget_price NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retarget_srp NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retarget_free_shipping BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS retarget_button_text TEXT DEFAULT 'COMANDĂ ACUM',
  ADD COLUMN IF NOT EXISTS retarget_urgency_text TEXT DEFAULT 'Ofertă valabilă doar azi!',
  ADD COLUMN IF NOT EXISTS retarget_countdown_hours INTEGER DEFAULT 24,
  ADD COLUMN IF NOT EXISTS retarget_gift_product_id UUID REFERENCES products(id),
  ADD COLUMN IF NOT EXISTS retarget_gift_quantity INTEGER DEFAULT 1;
