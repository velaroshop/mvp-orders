-- Migration 102: two more funnel steps on each visit of an own page: the visitor started filling the order form,
-- and the visitor sent the order. Both are set by the tracker of the own pages (see migration 101).

ALTER TABLE page_visits ADD COLUMN IF NOT EXISTS form_started boolean NOT NULL DEFAULT false;
ALTER TABLE page_visits ADD COLUMN IF NOT EXISTS ordered boolean NOT NULL DEFAULT false;
