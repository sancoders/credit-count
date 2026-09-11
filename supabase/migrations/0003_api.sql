-- ===========================================================================
-- Credit Count v1 - database API
--
-- Three functions, and the difference between them is the point:
--
--   get_leaderboard   SECURITY DEFINER - must cross users, on purpose, and is
--                     shaped so that it cannot return anything else.
--   get_my_stats      SECURITY INVOKER - must never cross users, so RLS is
--                     evaluated inside it.
--   search_coasters   SECURITY INVOKER - reads a shared table, so the caller's
--                     own permissions are exactly right.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- get_leaderboard(window)
--
-- Public: granted to anon, so a signed-out visitor can read it (FR1, AC3).
--
-- It returns THREE COLUMNS and cannot leak which coasters anyone has ridden,
-- because those columns do not exist in its return type. That is a structural
-- guarantee rather than a correctly-written policy, which is why this is a
-- function and not a view over rides.
--
-- p_window is mapped through a whitelist CASE. There is no dynamic SQL, and an
-- unrecognised value falls through to all-time rather than erroring.
--
-- Within a window a credit counts on the date it was FIRST earned
-- (min(ridden_on) per user and coaster), consistent with the SOW's definition
-- that a credit is earned once. Re-riding an old coaster this week adds to the
-- ride count, not to this week's credits.
--
-- Opted-in users with no credits in the window are still listed, at zero, so a
-- user who has just signed up and opted in can see themselves.
-- ---------------------------------------------------------------------------
create or replace function public.get_leaderboard(p_window text default 'all')
returns table (rank bigint, display_name text, credits bigint)
language sql
security definer
set search_path = ''
stable
as $$
  with w as (
    select case lower(btrim(coalesce(p_window, 'all')))
             when 'day'   then current_date
             when 'week'  then current_date - 6
             when 'month' then current_date - 29
             else null
           end as from_date
  ),
  earned as (
    select r.user_id, r.coaster_id, min(r.ridden_on) as earned_on
    from public.rides r
    group by r.user_id, r.coaster_id
  ),
  scored as (
    select p.id, p.display_name, count(e.coaster_id) as credits
    from public.profiles p
    left join earned e
           on e.user_id = p.id
          and ( (select w.from_date from w) is null
                or e.earned_on >= (select w.from_date from w) )
    where p.show_on_leaderboard
    group by p.id, p.display_name
  )
  select lb.rnk, lb.name, lb.credits
  from (
    select rank() over (order by s.credits desc) as rnk,
           s.display_name as name,
           s.credits
    from scored s
  ) lb
  order by lb.rnk asc, lb.name asc;
$$;

revoke all on function public.get_leaderboard(text) from public;
grant execute on function public.get_leaderboard(text) to anon, authenticated;


-- ---------------------------------------------------------------------------
-- get_my_stats()
--
-- SECURITY INVOKER, so Row Level Security is evaluated inside the function and
-- it is structurally incapable of returning another user's data - including
-- when an admin calls it.
--
-- The explicit user_id filter is a second lock, not the first. RLS is the
-- boundary; this makes the intent readable and keeps the plan tight.
-- ---------------------------------------------------------------------------
create or replace function public.get_my_stats()
returns jsonb
language sql
security invoker
set search_path = ''
stable
as $$
  with my as (
    select r.coaster_id, c.name, c.park, c.country, c.manufacturer, c.type
    from public.rides r
    join public.coasters c on c.id = r.coaster_id
    where r.user_id = (select auth.uid())
  )
  select jsonb_build_object(
    'credits', (select count(distinct m.coaster_id) from my m),
    'rides',   (select count(*) from my m),
    'by_country', (
      select coalesce(jsonb_agg(x order by x.credits desc, x.label asc), '[]'::jsonb)
      from (select m.country as label, count(distinct m.coaster_id) as credits
            from my m group by m.country) x
    ),
    'by_manufacturer', (
      select coalesce(jsonb_agg(x order by x.credits desc, x.label asc), '[]'::jsonb)
      from (select m.manufacturer as label, count(distinct m.coaster_id) as credits
            from my m group by m.manufacturer) x
    ),
    'by_type', (
      select coalesce(jsonb_agg(x order by x.credits desc, x.label asc), '[]'::jsonb)
      from (select m.type as label, count(distinct m.coaster_id) as credits
            from my m group by m.type) x
    ),
    'most_ridden', (
      select to_jsonb(t)
      from (select m.name, m.park, count(*) as rides
            from my m
            group by m.coaster_id, m.name, m.park
            order by count(*) desc, m.name asc
            limit 1) t
    )
  );
$$;

revoke all on function public.get_my_stats() from public;
grant execute on function public.get_my_stats() to authenticated;


-- ---------------------------------------------------------------------------
-- search_coasters(query, limit)
--
-- Catalogue search for the ride logger. A function rather than a filter built
-- in the application, so the search term travels as a bound parameter and no
-- query string is ever assembled from user input.
--
-- Filters on is_active: a soft-deleted coaster is unreachable for new rides,
-- while existing rides keep counting.
-- ---------------------------------------------------------------------------
create or replace function public.search_coasters(p_query text default '', p_limit int default 8)
returns table (id uuid, name text, park text, country text, manufacturer text, type text)
language sql
security invoker
set search_path = ''
stable
as $$
  select c.id, c.name, c.park, c.country, c.manufacturer, c.type
  from public.coasters c
  where c.is_active
    and ( btrim(coalesce(p_query, '')) = ''
          or c.name ilike '%' || btrim(p_query) || '%'
          or c.park ilike '%' || btrim(p_query) || '%' )
  order by
    case when c.name ilike btrim(coalesce(p_query, '')) || '%' then 0 else 1 end,
    c.name asc
  limit greatest(1, least(coalesce(p_limit, 8), 50));
$$;

revoke all on function public.search_coasters(text, int) from public;
grant execute on function public.search_coasters(text, int) to authenticated;
