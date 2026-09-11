@AGENTS.md

# Credit Count — build brief

This file is the brief the AI agent works from. It is the same brief I would hand a developer:
constraints, non-negotiables, and the acceptance criteria as the definition of done.

Read `docs/TDD.md` before changing anything. The TDD is the specification; this file is the
working agreement. If the build deviates from the TDD, the TDD gets updated in the same commit.

## What this is

A v1 credit tracker for rollercoaster enthusiasts, built from a Statement of Work. A **credit** is
a unique coaster ridden at least once. Riding the same coaster again increases the ride count but
not the credit count. The app tracks both.

## Stack (fixed by the SOW, not up for debate)

- Next.js 16 App Router on Vercel. Server Components by default, Server Actions for mutations.
- Supabase as the system of record: Auth, Postgres, and all server-side logic.
- TypeScript, Tailwind, Zod for input validation.
- Free tier only. No paid services.

## Non-negotiables

1. **Security lives in the database.** Every table has Row Level Security enabled with explicit
   policies. A check that exists only in the UI does not count. The SOW states this twice.
2. **No service role key. Anywhere.** Not in the client, not on the server, not in `.env.local`.
   The app always operates with the signed-in user's session, so RLS is the only thing standing
   between users and it is the same code path in development and in production. The catalogue is
   seeded through versioned SQL migrations; test accounts are created through the public sign-up
   endpoint.
3. **No secrets in the repository.** `.env*.local` is gitignored; `.env.example` carries names only.
4. **Migrations are versioned SQL** in `supabase/migrations/`. Nothing is changed by hand in the
   Supabase dashboard that does not also exist in the repo.
5. **Admin is a catalogue role, not a superuser.** No RLS policy on `rides` mentions `is_admin()`.
   That absence is deliberate and is tested.
6. **Nothing is considered working until it has been tested against the deployed app**, not just
   against localhost.

## Definition of done — the SOW's acceptance criteria

| ID | Criterion | How it is proven |
|----|-----------|------------------|
| AC1 | A new user signs up, logs rides on 3+ different coasters including a repeat, and sees credits, rides and stats update correctly | Live sign-up |
| AC2 | A second user cannot view, edit or delete the first user's rides, through the interface or through direct API calls | `npm run verify:rls` |
| AC3 | The leaderboard is visible to a signed-out visitor and shows only opted-in users, display name and credit count only | Private window |
| AC4 | An enthusiast cannot add, edit or delete catalogue entries by any means; an admin can | `npm run verify:rls` + admin panel |
| AC5 | No secrets in client-side code or the repository | Repo + Vercel env var screen |
| AC6 | The TDD accurately describes what was built, and every deviation from the SOW is flagged with reasoning | Final read-through of the TDD against the deployment |

A deviation from the SOW is not a defect as long as it is declared in the TDD with its reasoning.
An undeclared one is.

## Functional requirements worth restating

- **FR2 is a number, not a feeling.** Logging a ride must take no more than **three interactions**
  from the dashboard. The design makes them countable: type in the always-visible search box, click
  the coaster, click Log ride. The date defaults to today and the note is optional.
- **FR5**: stats update with no manual refresh step. Server Actions plus `revalidatePath`.
- **FR7**: opting out of the leaderboard takes effect immediately, and the leaderboard must never
  be able to reveal which coasters someone has ridden.

## Conventions

- Everything user-facing, every identifier and every commit message is in **English**.
- Commits are small and explain the decision, not the diff.
- Server Actions validate input with Zod and re-check authentication. They are reachable by direct
  POST, not only through the UI.
- Queries filter by `user_id` explicitly even though RLS already does. RLS is the boundary; the
  explicit filter is a second lock, not the first.
- Catalogue reads filter on `is_active = true`. Stats and ride history do not, so a deactivated
  coaster still counts towards a user's history.

## Commands

```bash
npm run dev          # local development
npm run build        # production build, must pass before any push
npm run lint         # eslint
npm run verify:rls   # the negative security tests, run against the real database
npm run seed:users   # create the demo accounts through public sign-up
```
