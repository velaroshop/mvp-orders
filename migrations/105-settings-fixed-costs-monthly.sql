-- Fixed costs per month (RON, without VAT), spread evenly over the days on the Profit page
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS fixed_costs_monthly DECIMAL(10,2) NULL;

COMMENT ON COLUMN settings.fixed_costs_monthly IS 'Fixed costs per month (RON, without VAT). Spread evenly over the days of the month on the Profit page.';
