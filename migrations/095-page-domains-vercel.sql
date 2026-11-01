-- Migration 095: remember which verified domains were added to the hosting project (Vercel).
-- A domain is "active" once it is added there AND its DNS points to the server. Nothing existing is touched.

ALTER TABLE page_domains ADD COLUMN IF NOT EXISTS vercel_added boolean NOT NULL DEFAULT false;
