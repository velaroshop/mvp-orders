-- Migration 055: Enable RLS on all unprotected public tables
-- Fixes Supabase Security Advisory: tables without RLS are queryable via anon key
--
-- All 7 tables are accessed exclusively via service role key (supabaseAdmin),
-- which bypasses RLS. Enabling RLS without adding new policies effectively
-- blocks anonymous access while keeping server-side functionality intact.

-- 1. NextAuth tables (managed by SupabaseAdapter with service role key)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_tokens ENABLE ROW LEVEL SECURITY;

-- 2. partial_orders - already has policy from migration 031, just needs RLS enabled
ALTER TABLE partial_orders ENABLE ROW LEVEL SECURITY;

-- 3. Server-only tables (accessed only via supabaseAdmin)
ALTER TABLE meta_events_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
