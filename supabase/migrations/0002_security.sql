-- ===========================================================================
-- Credit Count v1 - access control
--
-- This file is the whole security model. The SOW states that leaks between
-- users are "the most serious defect this app could have", and that admin
-- restrictions "must hold at the database layer, not only in the interface".
-- So every access decision lives here, and the application is not trusted
-- with any of them.
--
-- The deployed app never uses a service role key. Every query runs with the
-- signed-in user's session, which means these policies are the same code path
-- in development, in production, and in the verification script.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. Helper: is the caller an admin?
--
-- SECURITY DEFINER on purpose. If the coasters policy queried profiles
-- directly, profiles' own RLS would be evaluated inside a policy - a route to
-- recursion and to silent false negatives. This function breaks that cycle.
-- search_path is pinned so a shadowing schema cannot hijack it.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = (select auth.uid())),
    false
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;


-- ---------------------------------------------------------------------------
-- 2. Sign-up: create the profile row.
--
-- SECURITY DEFINER, so profiles needs no INSERT policy at all: rows can only
-- ever come into existence through Supabase Auth. Deliberately defensive,
-- because a failure here would break sign-up entirely.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  v_name := btrim(coalesce(new.raw_user_meta_data ->> 'display_name', ''));

  if char_length(v_name) < 2 then
    v_name := btrim(split_part(coalesce(new.email, ''), '@', 1));
  end if;

  if char_length(v_name) < 2 then
    v_name := 'Rider';
  end if;

  insert into public.profiles (id, display_name)
  values (new.id, left(v_name, 40));

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ---------------------------------------------------------------------------
-- 3. No privilege escalation.
--
-- is_admin cannot be changed by ANY application session - not by an
-- enthusiast raising themselves, and not by an admin promoting somebody else.
-- auth.uid() is null only when the statement comes from outside an end-user
-- session, i.e. an operator with direct database access. That is exactly the
-- SOW's "admin access is granted manually (there is no self-serve admin
-- sign-up)".
--
--   update public.profiles set is_admin = true where id = '<uuid>';
-- ---------------------------------------------------------------------------
create or replace function public.prevent_admin_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_admin is distinct from old.is_admin and (select auth.uid()) is not null then
    raise exception 'is_admin cannot be changed from an application session'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_block_admin_change
  before update on public.profiles
  for each row execute function public.prevent_admin_change();


-- ---------------------------------------------------------------------------
-- 4. Rides cannot be logged in the future.
--
-- A trigger rather than a CHECK constraint: current_date is not immutable, and
-- a CHECK built on it breaks dump and restore.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_ride_date()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.ridden_on > current_date then
    raise exception 'ridden_on cannot be in the future'
      using errcode = '22007';
  end if;
  return new;
end;
$$;

create trigger rides_check_date
  before insert or update on public.rides
  for each row execute function public.enforce_ride_date();


-- ===========================================================================
-- 5. Row Level Security
-- ===========================================================================

alter table public.profiles enable row level security;
alter table public.coasters enable row level security;
alter table public.rides    enable row level security;


-- profiles ------------------------------------------------------------------
-- Own row only, in both directions. No INSERT policy (see section 2) and no
-- DELETE policy: accounts are removed through Supabase Auth, which cascades.

create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);


-- coasters ------------------------------------------------------------------
-- The catalogue is shared, so any signed-in user reads all of it. Visitors get
-- nothing: FR1 says a visitor sees the leaderboard and the sign-up page, and
-- no other data. The public leaderboard does not depend on this policy - it is
-- served by a SECURITY DEFINER function, see 0003_api.sql.

create policy "coasters_select_authenticated"
  on public.coasters for select
  to authenticated
  using (true);

-- FOR ALL covers insert, update and delete. A non-admin INSERT is rejected by
-- the WITH CHECK; a non-admin UPDATE or DELETE matches no rows, because the
-- read-only policy above does not apply to write commands.
create policy "coasters_admin_write"
  on public.coasters for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- rides ---------------------------------------------------------------------
-- Note what is NOT here: no policy on this table mentions is_admin().
--
-- Admin is a catalogue role, not a superuser. The SOW's role table says an
-- admin "does not have access to individual users' private ride histories",
-- so an admin selecting another user's rides gets zero rows, exactly like any
-- other user would. That absence is a design decision and it is covered by a
-- test in scripts/verify-rls.ts.

create policy "rides_select_own"
  on public.rides for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "rides_insert_own"
  on public.rides for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "rides_update_own"
  on public.rides for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "rides_delete_own"
  on public.rides for delete
  to authenticated
  using ((select auth.uid()) = user_id);
