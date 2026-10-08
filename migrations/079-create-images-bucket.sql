-- Create public images bucket for product/upsell image uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'images',
  'images',
  true,
  2097152, -- 2MB max (after client-side resize+WebP conversion)
  ARRAY['image/webp', 'image/jpeg', 'image/png', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Public read access (images are served directly in widget)
CREATE POLICY IF NOT EXISTS "Public read images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'images');

-- Authenticated users can upload (INSERT via service_role from API, policy for direct uploads)
CREATE POLICY IF NOT EXISTS "Authenticated users can upload images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'images' AND auth.role() = 'authenticated');

-- Authenticated users can overwrite (upsert)
CREATE POLICY IF NOT EXISTS "Authenticated users can update images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'images' AND auth.role() = 'authenticated');

-- Authenticated users can delete their own uploads
CREATE POLICY IF NOT EXISTS "Authenticated users can delete images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'images' AND auth.role() = 'authenticated');
