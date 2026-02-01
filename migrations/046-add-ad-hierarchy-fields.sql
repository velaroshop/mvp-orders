-- Add hierarchy fields to facebook_ad_posts for manual grouping
-- Ad Account > Campaign > AdSet > Ad Name

ALTER TABLE facebook_ad_posts
  ADD COLUMN ad_account TEXT,
  ADD COLUMN campaign TEXT,
  ADD COLUMN adset TEXT,
  ADD COLUMN ad_name TEXT;
