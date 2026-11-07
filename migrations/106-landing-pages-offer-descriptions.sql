-- Optional one-line description under the title of each offer (e.g. "Abdomen + coapse"), shown by the V4 order form of the own pages.
-- Empty by default: the widget (V1-V3) ignores it.
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS offer_description_1 text;
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS offer_description_2 text;
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS offer_description_3 text;
