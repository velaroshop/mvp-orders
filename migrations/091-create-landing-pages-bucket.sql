-- Migration 091: separate public Storage bucket for images used on own landing pages
-- Images are uploaded already shrunk and converted to WebP by the page editor (src/lib/process-page-image.ts),
-- so the bucket only accepts WebP and small files. Reads use the public URL (no policy needed);
-- uploads go through the server with the service role.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('landing-pages', 'landing-pages', true, 5242880, ARRAY['image/webp'])
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;
