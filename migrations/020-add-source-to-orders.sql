-- Add source field to orders table to track where the order came from
ALTER TABLE orders ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'direct';

COMMENT ON COLUMN orders.source IS 'Source of the order: direct (from landing page) or partial (converted from partial order)';

-- Create index for faster filtering by source
CREATE INDEX IF NOT EXISTS idx_orders_source ON orders(source);
