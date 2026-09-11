-- ===========================================================================
-- Credit Count v1 - schema
--
-- A credit is a unique coaster a user has ridden at least once. Riding the
-- same coaster again increases the ride count but not the credit count.
-- Both numbers are DERIVED from public.rides and never stored: a stored
-- counter is a second source of truth that drifts the first time a write
-- path forgets to update it.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user, created by a trigger on sign-up.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  display_name        text        not null,
  is_admin            boolean     not null default false,
  show_on_leaderboard boolean     not null default false,
  created_at          timestamptz not null default now(),

  constraint profiles_display_name_length
    check (char_length(btrim(display_name)) between 2 and 40)
);

comment on table public.profiles is
  'Public-facing user record. Both flags default to false: privacy is the default.';
comment on column public.profiles.is_admin is
  'Catalogue-management role. Granted out of band with direct database access only; '
  'a trigger rejects any change made from an application session.';
comment on column public.profiles.show_on_leaderboard is
  'Opt-in to the public leaderboard. Opting out takes effect on the next read.';

-- ---------------------------------------------------------------------------
-- coasters: the shared catalogue. Seeded, then maintained by admins.
-- ---------------------------------------------------------------------------
create table public.coasters (
  id           uuid primary key default gen_random_uuid(),
  name         text        not null,
  park         text        not null,
  country      text        not null,
  manufacturer text        not null,
  type         text        not null,
  is_active    boolean     not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- The SOW names duplicate entries as a data-quality risk that would corrupt
  -- credit comparisons between users. This is the cheapest guard against it.
  constraint coasters_name_park_unique unique (name, park),
  constraint coasters_type_valid       check (type in ('Steel', 'Wooden', 'Hybrid')),
  constraint coasters_name_length      check (char_length(btrim(name)) between 1 and 120),
  constraint coasters_park_length      check (char_length(btrim(park)) between 1 and 120)
);

comment on column public.coasters.is_active is
  'Soft delete. A coaster with logged rides is deactivated rather than removed, so no '
  'catalogue operation can destroy a user history. Catalogue and search read active '
  'rows only; stats and ride history do not filter, so an old ride still counts.';

create index coasters_active_name_idx on public.coasters (name) where is_active;

-- ---------------------------------------------------------------------------
-- rides: one row per ride. Repeats are expected and carry no unique constraint.
-- ---------------------------------------------------------------------------
create table public.rides (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users (id) on delete cascade,
  -- ON DELETE RESTRICT, not CASCADE: deleting a catalogue row must never be
  -- able to delete somebody's history. Structural, not a matter of care.
  coaster_id uuid        not null references public.coasters (id) on delete restrict,
  ridden_on  date        not null default current_date,
  note       text,
  created_at timestamptz not null default now(),

  constraint rides_note_length check (note is null or char_length(note) <= 280)
);

create index rides_user_idx         on public.rides (user_id);
create index rides_user_coaster_idx on public.rides (user_id, coaster_id);
create index rides_user_date_idx    on public.rides (user_id, ridden_on desc);

-- ---------------------------------------------------------------------------
-- updated_at bookkeeping for the catalogue.
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger coasters_touch_updated_at
  before update on public.coasters
  for each row execute function public.touch_updated_at();
