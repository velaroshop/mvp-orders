-- Migration 056: Fix Supabase security linter warnings
-- All affected tables use supabaseAdmin (service role key) which bypasses RLS.
-- These changes only affect direct access via anon/authenticated keys.

-- ============================================================
-- 1. FIX: rls_policy_always_true on orders
--    Drop manually-created "Allow all operations for now" USING(true)
--    Proper policy "Active users can manage orders" from migration 031 remains
-- ============================================================
DROP POLICY IF EXISTS "Allow all operations for now" ON orders;

-- ============================================================
-- 2. FIX: rls_policy_always_true on upsells
--    Drop overly permissive INSERT/UPDATE/DELETE policies
--    Keep: "Service role can manage all upsells" (proper)
--    Keep: "Authenticated users can view upsells" (SELECT - not warned)
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can insert upsells" ON upsells;
DROP POLICY IF EXISTS "Authenticated users can update upsells" ON upsells;
DROP POLICY IF EXISTS "Authenticated users can delete upsells" ON upsells;

-- ============================================================
-- 3. FIX: function_search_path_mutable
--    Set explicit search_path on all public functions
-- ============================================================
ALTER FUNCTION public.search_orders SET search_path = public;
ALTER FUNCTION public.update_updated_at_column SET search_path = public;
ALTER FUNCTION public.update_meta_events_outbox_updated_at SET search_path = public;
ALTER FUNCTION public.immutable_unaccent SET search_path = public;

-- These two may have been created via Supabase Dashboard (not in migrations)
DO $$
BEGIN
  ALTER FUNCTION public.generate_order_number SET search_path = public;
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'Function generate_order_number does not exist, skipping';
END;
$$;

DO $$
BEGIN
  ALTER FUNCTION public.set_order_number SET search_path = public;
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'Function set_order_number does not exist, skipping';
END;
$$;
