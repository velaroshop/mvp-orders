-- Add VAT enabled flag to settings table
-- When true, orders are sent to Helpship with vatPercentage: 21
-- When false (default), orders are sent with vatPercentage: 0

ALTER TABLE settings ADD COLUMN IF NOT EXISTS vat_enabled BOOLEAN DEFAULT FALSE;
