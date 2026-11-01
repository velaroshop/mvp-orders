-- Migration 097: the landing-pages bucket also accepts short MP4 videos (looping before/after clips, product demos).
-- Videos are uploaded as ready-made MP4 (H.264, no sound) up to 4 MB by the page editor; images stay WebP only.
-- The 5 MB bucket limit is unchanged. Nothing else is touched.

UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/webp', 'video/mp4']
WHERE id = 'landing-pages';
