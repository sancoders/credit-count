-- ===========================================================================
-- Credit Count v1 - close the two remaining anon RPC endpoints
--
-- Same trap as migration 0005, found by auditing has_function_privilege()
-- rather than by reading the migrations: "revoke all ... from public" does not
-- take EXECUTE away from anon or authenticated on Supabase, because those
-- roles hold explicit grants of their own. Each role has to be named.
--
-- Neither endpoint leaked anything. get_my_stats() is SECURITY INVOKER, so for
-- a signed-out caller auth.uid() is null and RLS returns nothing: it reported
-- zero credits and zero rides. search_coasters() is also INVOKER and the
-- coasters policies are `to authenticated`, so it returned an empty list.
--
-- They are revoked anyway, because FR1 says a visitor can see the leaderboard
-- and the sign-up page and "no other data" - and an endpoint that answers a
-- visitor at all, even with zeroes, is one more thing that has to keep being
-- correct. get_leaderboard stays open to anon: that one is the feature.
-- ===========================================================================

revoke all on function public.get_my_stats() from anon;
revoke all on function public.search_coasters(text, int) from anon;
