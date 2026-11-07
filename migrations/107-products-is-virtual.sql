-- Marks a product as virtual (no physical stock): the dashboard stock analysis leaves it out of its product list.
-- Physical (false) by default, so nothing changes for existing products until they are marked.
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_virtual boolean NOT NULL DEFAULT false;
