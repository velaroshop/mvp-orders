-- Migration 112: share preview (Facebook / WhatsApp link card) for own pages.
-- - landing_page_content.share_image_url: image shown when the page link is shared (og:image). Empty = chosen
--   automatically from the page (first photo of the main blocks, then the video poster).
-- - landing_page_content.share_title / share_description: text of the link card. Empty = the page title, no description.
-- The bucket also accepts JPEG. Nothing else is touched.

ALTER TABLE landing_page_content ADD COLUMN IF NOT EXISTS share_image_url text;
ALTER TABLE landing_page_content ADD COLUMN IF NOT EXISTS share_title text;
ALTER TABLE landing_page_content ADD COLUMN IF NOT EXISTS share_description text;

-- The share image is stored as a JPEG (social crawlers do not all read WebP), so the bucket also accepts image/jpeg
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/webp', 'video/mp4', 'image/png', 'image/jpeg']
WHERE id = 'landing-pages';
