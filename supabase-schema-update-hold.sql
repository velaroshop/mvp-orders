-- Schema update pentru a adăuga status "hold" și câmpul order_note
-- Rulează acest SQL în Supabase Dashboard → SQL Editor

-- Adaugă statusul "hold" la constraint-ul existent
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('pending', 'confirmed', 'cancelled', 'hold'));

-- Adaugă câmpul pentru notă (max 2 linii)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_note TEXT;

-- Comentariu pentru claritate
COMMENT ON COLUMN orders.order_note IS 'Notă pentru comandă (max 2 linii). Poate fi introdusă când se pune comanda pe hold.';
