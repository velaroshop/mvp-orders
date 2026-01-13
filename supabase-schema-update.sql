-- Schema update pentru order numbering și settings
-- Rulează acest SQL în Supabase Dashboard → SQL Editor

-- Tabel pentru setări (order prefix)
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inserăm prefix-ul default pentru comenzi
INSERT INTO settings (key, value) 
VALUES ('order_prefix', 'JMR-TEST')
ON CONFLICT (key) DO NOTHING;

-- Adăugăm coloană order_number în tabela orders
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS order_number INTEGER;

-- Adăugăm coloană postal_code în tabela orders (cod poștal sugerat de Helpship)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS postal_code TEXT;

-- Creăm o secvență pentru order_number
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

-- Funcție pentru a genera order_number automat
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS INTEGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT nextval('order_number_seq') INTO next_num;
  RETURN next_num;
END;
$$ LANGUAGE plpgsql;

-- Trigger pentru a seta order_number automat la creare
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := generate_order_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_order_number_trigger
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_order_number();

-- Index pentru order_number
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);

-- Enable RLS pentru settings
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for settings" ON settings
  FOR ALL
  USING (true)
  WITH CHECK (true);
