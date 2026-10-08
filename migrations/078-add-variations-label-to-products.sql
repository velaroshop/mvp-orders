-- Migration 078: Adaugă eticheta variațiilor la nivel de produs
-- Aceasta devine eticheta default afișată în widget.
-- Landing page-ul o poate suprascrie cu propriul variations_label.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS variations_label TEXT;
