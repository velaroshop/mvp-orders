-- Migration 098: favicon (browser tab icon) per custom domain, shown on every own page served on that domain.
-- The icon is stored as a PNG in the landing-pages bucket, so the bucket also accepts image/png (images stay WebP, videos MP4).
-- Nothing else is touched.

ALTER TABLE page_domains ADD COLUMN IF NOT EXISTS favicon_url text;

UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/webp', 'video/mp4', 'image/png']
WHERE id = 'landing-pages';
