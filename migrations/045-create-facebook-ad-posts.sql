-- Migration 045: Create facebook_ad_posts table
-- Stores specific ad post IDs per Facebook page for comment moderation

CREATE TABLE IF NOT EXISTS facebook_ad_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facebook_page_id UUID NOT NULL REFERENCES facebook_pages(id) ON DELETE CASCADE,
  post_id TEXT NOT NULL,
  post_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_facebook_ad_posts_page_id ON facebook_ad_posts(facebook_page_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_facebook_ad_posts_unique ON facebook_ad_posts(facebook_page_id, post_id);

-- RLS
ALTER TABLE facebook_ad_posts ENABLE ROW LEVEL SECURITY;

-- Comments
COMMENT ON TABLE facebook_ad_posts IS 'Ad post IDs configured per Facebook page for comment moderation';
