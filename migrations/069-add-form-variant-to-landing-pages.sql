-- Migration 069: Add form variant to landing pages
-- Allows selecting different widget form layouts per landing page.
-- Variant 1 (default): current layout (delivery fields → offers → upsells → summary)
-- Variant 2: offers first (offers → delivery fields → upsells → summary) + explicit old/new price header

ALTER TABLE landing_pages
  ADD COLUMN IF NOT EXISTS form_variant INTEGER NOT NULL DEFAULT 1;
