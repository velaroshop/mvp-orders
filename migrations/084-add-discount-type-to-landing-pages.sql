ALTER TABLE landing_pages
  ADD COLUMN IF NOT EXISTS discount_type TEXT NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent', 'amount'));
