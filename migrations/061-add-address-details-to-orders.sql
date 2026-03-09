-- Add address_details column for storing building details (bloc, scara, apt, indicatii)
-- This replaces the old "street number" concept with a proper "address details" field
-- addressLine1/street in Helpship = full address (street + number)
-- addressLine2/number in Helpship = address details (bloc, scara, apt)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS address_details TEXT;
COMMENT ON COLUMN orders.address_details IS 'Additional address details (bloc, scara, apt, indicatii)';
