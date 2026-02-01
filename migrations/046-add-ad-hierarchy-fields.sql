-- Add hierarchy fields to facebook_ad_posts for manual grouping
-- Ad Account > Campaign > AdSet

ALTER TABLE facebook_ad_posts
  ADD COLUMN ad_account TEXT,
  ADD COLUMN campaign TEXT,
  ADD COLUMN adset TEXT;
