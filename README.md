# Credit Count

A credit tracker for rollercoaster enthusiasts. Log every ride against a shared catalogue, watch
your **credit count** — unique coasters ridden — next to your total ride count, and appear on the
public leaderboard only if you choose to.

Built from a Statement of Work as a technical exercise for Koin Limited. The design document is in
[`docs/TDD.md`](docs/TDD.md) and it was written before any code, which is why it is the first commit
in this repository.

- **Live app:** see the submission email
- **Design document:** [`docs/TDD.md`](docs/TDD.md)
- **Access control, in one file:** [`supabase/migrations/0002_security.sql`](supabase/migrations/0002_security.sql)

## Stack

| Layer | Choice |
|---|---|
| Front end | Next.js 16, App Router, React Server Components, Server Actions |
| Hosting | Vercel |
| Auth, database, server-side logic | Supabase (Postgres with Row Level Security) |
| Validation | Zod, in every Server Action |
| Styling | Tailwind CSS 4 |

## The security model in three sentences

Row Level Security is the boundary, not the interface. The deployed app never uses a service role
key — every query runs with the signed-in user's session, so the policies are the same code path in
development, in production and in the test script. No policy on the `rides` table mentions
`is_admin()`, so an admin reading another rider's history gets zero rows, exactly like anyone else.

Read [`supabase/migrations/0002_security.sql`](supabase/migrations/0002_security.sql); it is
commented and it is the whole model.

## Running it locally

```bash
git clone https://github.com/sancoders/credit-count.git
cd credit-count
npm install
cp .env.example .env.local   # then fill in the two Supabase values
npm run dev
```

`.env.local` needs:

| Variable | Where it comes from |
|---|---|
| `SUPABASE_URL` | Supabase → Project settings → API |
| `SUPABASE_PUBLISHABLE_KEY` | same page, the `sb_publishable_…` key |

Note the absence of a `NEXT_PUBLIC_` prefix. That prefix is what inlines a value into the browser
bundle, and nothing in the browser needs these: every Supabase call happens in a Server Component, a
Server Action or `proxy.ts`. **There is no `SUPABASE_SERVICE_ROLE_KEY` in this project at all** — not
in the repo, not in Vercel, not on a developer machine.

The `DEMO_*` variables in `.env.example` are only used by the two scripts below. They are ordinary
end-user credentials, not keys.

## Setting up a fresh Supabase project

1. Apply the migrations in `supabase/migrations/` in order. They are plain SQL and idempotent enough
   to paste into the SQL editor, or run them with the Supabase CLI.
2. Under **Authentication → Sign In / Providers → Email**, turn **Confirm email** off. This is a
   deliberate deviation, declared in the TDD: it lets a reviewer create an account and use it
   immediately. In production it would be on.
3. Seed the demo accounts and their ride history:

   ```bash
   npm run seed:demo
   ```

4. **Grant the admin role manually.** The SOW specifies that there is no self-serve admin sign-up,
   and the database enforces it: a trigger rejects any change to `profiles.is_admin` that comes from
   an application session. Neither the app nor the seed script can do this. Run it as an operator, in
   the SQL editor:

   ```sql
   update public.profiles set is_admin = true
   where id = (select id from auth.users where email = 'admin@creditcount.app');
   ```

   The seed script prints this line with the right id when it finishes.

## Commands

```bash
npm run dev          # local development
npm run build        # production build
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
npm run seed:demo    # create the demo accounts through public sign-up
npm run verify:rls   # the negative security tests, against the real database
```

### `npm run verify:rls`

Twenty-two checks run over PostgREST with the application out of the way, signed in as real
accounts. It proves the acceptance criteria that matter:

```
One enthusiast against another enthusiast     read, edit, delete another user's rides
An enthusiast against the shared catalogue    insert, update, delete catalogue rows
Privilege escalation                          setting is_admin on your own profile
A signed-out visitor                          rides, profiles, catalogue, private RPCs
The admin is a catalogue role                 reading a ride history, and failing
Data integrity                                future dates, forged user_id
```

Every one of them is expected to fail at the database. It exits non-zero on the first failure, and it
runs in CI on every push.

## Schema

```
profiles   id → auth.users, display_name, is_admin, show_on_leaderboard, created_at
coasters   id, name, park, country, manufacturer, type, is_active, timestamps
           unique (name, park)
rides      id, user_id → auth.users, coaster_id → coasters ON DELETE RESTRICT,
           ridden_on, note, created_at
```

`credits` is `count(distinct coaster_id)` and `rides` is `count(*)`. Neither is stored: a counter is
a second source of truth that drifts the first time a write path forgets to update it.

`rides.coaster_id` is `ON DELETE RESTRICT`, so no catalogue operation can destroy a rider's history.
Removing a coaster that has rides deactivates it instead — it leaves the catalogue and the search,
and every existing ride keeps counting.

## Repository layout

```
app/                     routes; every page is a Server Component
components/              UI, with three client components for form state
lib/actions/             Server Actions, one file per area, all Zod-validated
lib/supabase/server.ts   the only Supabase client in the codebase
lib/auth.ts              getViewer / requireViewer / requireAdmin
proxy.ts                 session refresh and an optimistic route guard
scripts/                 seed-demo.ts and verify-rls.ts
supabase/migrations/     versioned SQL; 0002 is the access control model
docs/TDD.md              the design document
```

## What v1 does not do

Live RCDB integration, native apps, password reset beyond Supabase's default, payments,
localisation — all out of scope per the SOW. On top of those: no duplicate-merge tooling, so a rider
who logged both copies of a duplicated coaster keeps two credits until an admin merges them, which is
a v2 operation. The reasoning for each is in the TDD.
