-- Add courier and packaging costs to settings table
-- Used to pre-populate shipping cost in ROAS calculator
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS courier_cost DECIMAL(10,2) NULL,
  ADD COLUMN IF NOT EXISTS packaging_cost DECIMAL(10,2) NULL;

COMMENT ON COLUMN settings.courier_cost IS 'Courier cost per order (RON). Entered without VAT if org is VAT payer.';
COMMENT ON COLUMN settings.packaging_cost IS 'Packaging cost per order (RON). Entered without VAT if org is VAT payer.';
