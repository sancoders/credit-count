# Credit Count — Technical Design Document

**Version** 1.0 · **Date** 2026-09-11 · **Author** Santiago Cione
**Source** Credit Count Statement of Work, Koin Limited, July 2026

---

## 1. Overview

Credit Count is a small multi-user web app for rollercoaster enthusiasts. Users log each ride
against a shared coaster catalogue and see their **credit count** — unique coasters ridden — beside
their total ride count and a set of stats. Users who opt in appear on a public leaderboard;
everyone else stays private.

The approach is deliberately narrow: **Supabase Postgres is the security boundary, not the UI.**
Next.js renders and validates; every access decision is enforced by Row Level Security. The
deployed app holds no service role key, so no code path can read data its signed-in user could not
read directly.

## 2. Scope

**In scope (v1)** — email and password auth with a display name chosen at sign-up; a shared
catalogue of 46 real coasters (name, park, country, manufacturer, type); ride logging with date
and optional note; a per-user dashboard with credits, rides, credits by country, manufacturer and
type, and most-ridden coaster; an editable ride history; a public opt-in leaderboard; and admin
catalogue management.

**Out of scope**, taken from the SOW — live RCDB integration (the catalogue is seeded and
admin-maintained), native mobile apps, password reset beyond Supabase's defaults, payments,
localisation. **Added by me:** no duplicate-merge tooling (see §8).

## 3. Architecture

```
Browser ──▶ Next.js 16 on Vercel ──▶ Supabase
            Server Components            Auth (email + password)
            Server Actions               Postgres + Row Level Security
            proxy.ts (session refresh)   SECURITY DEFINER / INVOKER functions
```

Reads happen in Server Components; writes in Server Actions that validate with Zod, re-check
authentication, and call `revalidatePath`, so stats update with no manual refresh (FR5). Session
cookies are refreshed in `proxy.ts` — Next.js 16's rename of middleware — which also redirects
signed-out visitors away from authenticated routes, as an optimistic check that every page and
action then re-does for itself.

**The service role key is never used, not even for seeding**: the catalogue ships as a versioned
SQL migration and demo accounts are created through public sign-up. It is not in the repository,
not in Vercel, and not on the developer machine.

## 4. Data model

| Table | Columns | Notes |
|---|---|---|
| `profiles` | `id` (PK → `auth.users`), `display_name`, `is_admin`, `show_on_leaderboard`, `created_at` | Created by a trigger on sign-up. Both booleans default to `false`: privacy is the default |
| `coasters` | `id`, `name`, `park`, `country`, `manufacturer`, `type`, `is_active`, timestamps | `unique (name, park)` guards against the duplicate entries the SOW flags as a data-quality risk |
| `rides` | `id`, `user_id` → `auth.users`, `coaster_id` → `coasters` **on delete restrict**, `ridden_on`, `note`, `created_at` | Indexed on `(user_id)`, `(user_id, coaster_id)`, `(user_id, ridden_on)` |

`credits` is `count(distinct coaster_id)` and `rides` is `count(*)`. **Neither is stored.** A
stored counter is a second source of truth that drifts the first time a write path forgets to
update it; at v1 volumes the aggregate is free. §7 covers where that stops being true.

`on delete restrict` on `rides.coaster_id` means no catalogue operation can destroy a user's
history, by construction rather than by care.

## 5. Security and access model

This is the section that matters. The SOW states that leaks between users are "the most serious
defect this app could have", so the design starts there.

**RLS is enabled on all three tables.** No table is readable without a policy that grants it.

| Table | Read | Write |
|---|---|---|
| `rides` | `auth.uid() = user_id` | insert, update and delete all require `auth.uid() = user_id` |
| `coasters` | any authenticated user; **visitors get nothing** (FR1) | `is_admin()` only, enforced `for all` |
| `profiles` | own row only | own row only; no insert policy, no delete policy |

**No `rides` policy mentions `is_admin()`.** Admin is a catalogue role, not a superuser, exactly as
the SOW's role table specifies. That absence is a design decision and is covered by a test.

**`is_admin()`** is `security definer` with `set search_path = public`. Querying `profiles`
directly from the `coasters` policy would evaluate `profiles` RLS inside a policy — a path to
recursion and to silent false negatives. The function breaks that cycle, and the pinned
`search_path` stops it being hijacked by a shadowing schema.

**`get_leaderboard(window)`** is `security definer`, granted to `anon`, and returns exactly three
columns: `rank`, `display_name`, `credits`. It **cannot** leak which coasters anyone has ridden,
because those columns do not exist in its return type. That is a structural guarantee rather than
a correctly-written policy, which is why it is a function and not a view over `rides`. The `window`
argument is mapped through a whitelist `CASE`; there is no dynamic SQL.

**`get_my_stats()`** and **`search_coasters()`** are `security invoker`, so RLS applies *inside*
them and they can only ever see what the caller can see. The contrast is deliberate: `definer`
where the query must cross users on purpose, `invoker` everywhere it must not. `search_coasters`
is a function rather than a filter assembled in the application, so the search term travels as a
bound parameter and no query string is ever built from user input.

**Nothing carries a `NEXT_PUBLIC_` prefix.** That prefix is what inlines a value into the browser
bundle, and no Supabase call happens in the browser: every one is in a Server Component, a Server
Action or `proxy.ts`. The publishable key would be safe to expose — it is public by design — but it
never has to be, so no key of any kind reaches client-side code.

**Grants were audited, not assumed.** Supabase's own database linter caught trigger functions
reachable as RPC endpoints, and a follow-up audit with `has_function_privilege` caught two more
callable by `anon`. Neither leaked — both are `security invoker` and RLS returned nothing — but
FR1 says a visitor sees the leaderboard and no other data, so they were closed (migrations 0005 and
0006). The lesson worth recording: on Supabase `revoke … from public` does **not** remove EXECUTE
from `anon` or `authenticated`, because those roles hold explicit grants of their own and have to be
named.

**Privilege escalation is blocked at the database.** A trigger rejects any change to
`profiles.is_admin` whenever `auth.uid()` is non-null — that is, whenever the change originates
from an end-user session. No enthusiast can promote themselves, and no admin can promote anyone
through the app. Admin is granted out of band with direct database access
(`update profiles set is_admin = true where id = '…'`), which is what the SOW's "granted manually,
there is no self-serve admin sign-up" requires.

A second trigger rejects `ridden_on` in the future. It is a trigger rather than a `CHECK`
constraint because `current_date` is not immutable and a check built on it breaks dump and restore.

## 6. Key decisions and trade-offs

| Decision | Alternative rejected | Cost accepted |
|---|---|---|
| Credits derived with `count(distinct …)` | Materialised per-user counter | Slower at large scale; at v1 volumes irrelevant, and it cannot drift |
| `security definer` function for the leaderboard | View over `rides` with RLS | Less flexible for future filters, but structurally incapable of exposing coasters |
| Server Actions | REST route handlers | Not reusable by third parties; smaller public surface and less code |
| No service role key at all | Service key for a seed script | Seeding is constrained to SQL and public sign-up; in exchange, the most dangerous credential in the system does not exist here |
| Soft delete for ridden coasters | Hard delete with cascade | Deactivated rows accumulate; no admin can ever destroy a user's history |

## 7. Free-tier limits that would matter at scale

- **Supabase free**: the project pauses after ~7 days of inactivity, which matters between
  submission and review more than it does in production; 500 MB of database; limits on monthly
  active users; no point-in-time recovery; a single region (London, chosen for UK latency).
- **Vercel Hobby**: function execution and bandwidth ceilings, and **no commercial use** — a real
  launch needs a paid plan on day one.
- **Where the design would bend first**: `get_leaderboard` does a `count(distinct)` across every
  opted-in user's rides on each page view. At a few thousand users that wants a materialised view
  refreshed on a schedule, or counters maintained by trigger, trading freshness for cost. The
  catalogue would want full-text search and pagination past a few thousand rows, and auth emails
  would need a real SMTP provider instead of Supabase's shared, rate-limited sender.

## 8. Assumptions and deviations

**Assumptions**

- Credits and stats are computed from what users log; no historic import (SOW §9).
- **Display names are not unique.** Two users can therefore appear identically on the leaderboard;
  the real identity is the user id, which is never exposed. v2 would add a unique handle, or
  disambiguate with a home park. Today this is a cosmetic collision, not a data one.
- **Catalogue deletion is a soft delete.** A coaster with no logged rides is deleted outright; one
  with rides is set `is_active = false`, disappearing from the catalogue and search while every
  user's history stays intact. v1 does **not** merge duplicates, so a user who logged both entries
  of a duplicated coaster keeps two credits. Merging is a v2 operation (§10).
- Ride notes are capped at 280 characters, and dates cannot be in the future.

**Deviations from the SOW, each with its reason**

1. **Email confirmation is disabled** in this deployment, so the supplied test accounts and any
   account the reviewer creates work immediately. In production it would be on. This is the only
   change to Supabase Auth's defaults.
2. **The leaderboard offers time windows** — all-time (the default), this month, this week, today —
   which the SOW does not ask for. The SOW leaves the leaderboard's time horizon unstated, and the
   ranking query is where that choice becomes expensive to change later, so v1 models it. Within a
   window a credit counts on the date it was **first** earned (`min(ridden_on)` per user and
   coaster), consistent with the SOW's definition that a credit is earned once. Dashboard stats
   remain all-time as specified.

   **What this discloses, stated plainly:** filtering by period tells a visitor that an opted-in
   rider earned a credit inside that period, to day granularity, and differencing the windows
   yields a coarse timeline of when their credits were earned. It never reveals *which* coaster, or
   how many times they rode it — those columns are not in the function's return type. FR7's
   requirement is that leaderboard visibility "must never expose which coasters a user has ridden",
   which holds. But this is timing information derived from a private ride history, it is the price
   of the feature, and the copy on the page says so rather than claiming more than the code
   delivers. If that trade is unwanted, the fix is to drop the windows, not to reword the page.
3. **The leaderboard includes a rank column** alongside display name and credit count. It is
   derived from the ordering the SOW itself specifies and reveals nothing further.
4. **`type` allows `Hybrid`** in addition to steel and wooden, because several seeded coasters are
   genuinely hybrid. The SOW's list is prefixed "e.g.".

## 9. Testing and verification

`npm run verify:rls` runs **25 checks** over PostgREST with the application out of the way. It
signs in as real users with the publishable key — the same door a browser uses, and the same door
an attacker would use — printing PASS or FAIL per line and exiting non-zero on failure:

- **one enthusiast against another**: read, edit and delete the other's rides, read their profile →
  no rows each time;
- **an enthusiast against the catalogue**: insert, update, delete → rejected;
- **privilege escalation**: setting your own `is_admin` → rejected by the trigger, and the flag is
  then *read back*, because "it errored" and "it errored but wrote anyway" are the difference
  between a failing test and a breach. An admin promoting someone else → no rows;
- **a signed-out visitor**: `rides`, `profiles`, `coasters`, `get_my_stats`, `search_coasters` → all
  closed; `get_leaderboard()` in every window → succeeds, exactly three columns, and an opted-out
  rider never appears;
- **an admin reading another user's rides → no rows**, while catalogue writes succeed;
- **integrity**: a future date and a forged `user_id` → both rejected.

They run against the real database because policies are the thing under test, and in CI alongside
lint and build. Acceptance criteria were then verified by hand against the deployed URL, including
a sign-up, three rides with one repeat, leaderboard opt-out, ride edit and delete, and a catalogue
removal that left every rider's history intact.

## 10. What's next

1. **Duplicate merge** for the catalogue: re-point rides to the canonical row inside a transaction,
   with an audit record. Note that affected users' credit counts will *drop*, which is a product
   decision before it is a technical one.
2. **Batch ride logging.** People return from a trip with fifteen coasters and log them one at a
   time today.
3. **Policy tests as a suite**, not a single script, so each policy has a named failing case.
4. **A materialised leaderboard** once `count(distinct)` per page view stops being free (§7).
5. **An audit log of admin catalogue changes**, which the SOW's data-quality risk implies but does
   not require.
