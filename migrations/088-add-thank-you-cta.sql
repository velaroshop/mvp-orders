-- Migration 088: Optional "see all products" CTA on the thank-you page
-- Store-level settings (message, button text/colors, destination) + per-landing-page switch.
-- Disabled by default: nothing changes until show_thank_you_cta is turned on for a landing page.

ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS thank_you_cta_message TEXT,
  ADD COLUMN IF NOT EXISTS thank_you_cta_button_text TEXT,
  ADD COLUMN IF NOT EXISTS thank_you_cta_button_color TEXT,
  ADD COLUMN IF NOT EXISTS thank_you_cta_button_text_color TEXT,
  ADD COLUMN IF NOT EXISTS thank_you_cta_url TEXT;

ALTER TABLE landing_pages
  ADD COLUMN IF NOT EXISTS show_thank_you_cta BOOLEAN NOT NULL DEFAULT false;
