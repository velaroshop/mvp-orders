-- Schema pentru tabela orders în Supabase
-- Rulează acest SQL în Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landing_key TEXT NOT NULL,
  offer_code TEXT NOT NULL CHECK (offer_code IN ('offer_1', 'offer_2', 'offer_3')),
  phone TEXT NOT NULL,
  full_name TEXT NOT NULL,
  county TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT NOT NULL,
  upsells JSONB DEFAULT '[]'::jsonb,
  subtotal DECIMAL(10, 2) NOT NULL,
  shipping_cost DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed')),
  helpship_order_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pentru căutări rapide
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_landing_key ON orders(landing_key);

-- Trigger pentru updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) - pentru început, permitem totul
-- Mai târziu putem restricționa accesul
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for now" ON orders
  FOR ALL
  USING (true)
  WITH CHECK (true);
