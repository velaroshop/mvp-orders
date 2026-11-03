-- Migration 103: the first JavaScript error message of a visit on an own page (short text, no personal data),
-- to tell harmless noise (in-app browsers, extensions) from real problems. Set by the tracker (see migrations 101 and 102).

ALTER TABLE page_visits ADD COLUMN IF NOT EXISTS js_error text;
