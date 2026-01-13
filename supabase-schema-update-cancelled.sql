-- Schema update pentru a adăuga status "cancelled" și câmpul cancelled_from_status
-- Rulează acest SQL în Supabase Dashboard → SQL Editor

-- Adaugă statusul "cancelled" la constraint-ul existent
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('pending', 'confirmed', 'cancelled'));

-- Adaugă câmpul pentru a salva statusul inițial înainte de cancel
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_from_status TEXT;

-- Comentariu pentru claritate
COMMENT ON COLUMN orders.cancelled_from_status IS 'Statusul comenzii înainte de a fi anulată (pending sau confirmed). Folosit pentru a restabili statusul la uncancel.';
