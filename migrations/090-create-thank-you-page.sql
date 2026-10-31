-- Migration 090: One editable thank-you page per organization (own system, served at /thank-you?order=...)
-- Same block model as landing_page_content. The organization is the primary key, so each organization
-- has at most one thank-you page. If no row exists, the app shows a built-in default layout.
-- Nothing existing is touched.

CREATE TABLE IF NOT EXISTS thank_you_page (
  organization_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  background text,
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Grants required for new tables (Supabase Data API); RLS on with no policies = no direct access from anon/authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON public.thank_you_page TO service_role;
GRANT SELECT ON public.thank_you_page TO authenticated;
ALTER TABLE public.thank_you_page ENABLE ROW LEVEL SECURITY;
