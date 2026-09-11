-- ===========================================================================
-- Credit Count v1 - tighten function grants
--
-- Found by Supabase's own database linter after the schema was in place, which
-- is exactly why it is worth running: everything in public is exposed through
-- PostgREST as /rest/v1/rpc/<name> unless the grant says otherwise, and
-- Supabase's default privileges hand EXECUTE to anon and authenticated.
--
-- Two problems it caught:
--
--   1. The trigger functions were reachable as RPC endpoints. Calling one
--      directly errors out ("trigger functions can only be called as
--      triggers"), so this was not exploitable, but an endpoint that exists
--      by accident is one nobody is thinking about.
--
--   2. is_admin() was callable by anon. It returns false for a signed-out
--      caller, so it leaked nothing, but the previous migration's
--      "revoke all ... from public" did not remove it: Supabase grants anon
--      and authenticated EXECUTE explicitly, not through PUBLIC, so each role
--      has to be named.
--
-- Verified first that this does not break the triggers themselves: PostgreSQL
-- checks EXECUTE on a trigger function when the trigger is CREATED, not when
-- it fires, so sign-up, the leaderboard toggle and ride logging are unaffected.
--
-- get_leaderboard is deliberately left executable by anon. That is the whole
-- design: a signed-out visitor reads the leaderboard and nothing else. The
-- linter flags it as a warning, and the answer is that it returns three
-- columns and cannot return a fourth.
-- ===========================================================================

revoke all on function public.handle_new_user()      from public, anon, authenticated;
revoke all on function public.prevent_admin_change() from public, anon, authenticated;
revoke all on function public.enforce_ride_date()    from public, anon, authenticated;
revoke all on function public.touch_updated_at()     from public, anon, authenticated;

revoke all on function public.is_admin() from anon;
