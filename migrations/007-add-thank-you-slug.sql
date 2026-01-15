-- Add thank_you_slug to stores table

ALTER TABLE stores ADD COLUMN IF NOT EXISTS thank_you_slug TEXT;

COMMENT ON COLUMN stores.thank_you_slug IS 'Slug for the thank you page (e.g., "multumim", "thank-you")';
