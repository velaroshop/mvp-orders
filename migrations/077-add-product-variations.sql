-- Migration 077: Adaugă suport pentru variații de produs
-- Variațiile sunt produse independente (parent_product_id IS NOT NULL)
-- Tratate ca produse separate în Helpship, cu SKU-uri proprii

-- Extinde tabela products cu câmpuri pentru variații
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS parent_product_id     UUID REFERENCES products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS variation_visual_type  TEXT CHECK (variation_visual_type IN ('image', 'color')),
  ADD COLUMN IF NOT EXISTS variation_visual_value TEXT,
  ADD COLUMN IF NOT EXISTS in_stock               BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS variation_display_order INTEGER NOT NULL DEFAULT 0;

-- Adaugă eticheta variațiilor per landing page (poate diferi de la o pagină la alta)
ALTER TABLE landing_pages
  ADD COLUMN IF NOT EXISTS variations_label TEXT;

-- Stochează variațiile selectate de client în comenzi
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS selected_variations JSONB;
-- Format: [{"productId":"uuid","name":"Verde","sku":"RDX-008-VERDE","quantity":1}, ...]
-- NULL pentru comenzile existente — compatibilitate deplină

-- Stochează variațiile selectate și în comenzile parțiale (pentru restaurare dacă userul revine)
ALTER TABLE partial_orders
  ADD COLUMN IF NOT EXISTS selected_variations JSONB;

-- Index pentru căutare rapidă a variațiilor după produsul părinte
CREATE INDEX IF NOT EXISTS idx_products_parent_product_id ON products(parent_product_id)
  WHERE parent_product_id IS NOT NULL;
