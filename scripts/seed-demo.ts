/**
 * Seed the demo accounts and their ride history.
 *
 * Every account here is created through the ordinary public sign-up endpoint
 * with the publishable key, and every ride is inserted under that account's own
 * session. There is no service role key in this project, so this script has
 * exactly the same powers a browser does - which also means it is covered by
 * the same Row Level Security policies the app runs under.
 *
 * One thing it deliberately CANNOT do is make somebody an admin. A database
 * trigger rejects any change to profiles.is_admin that comes from an
 * application session, so the admin flag has to be granted out of band:
 *
 *   update public.profiles set is_admin = true
 *   where id = (select id from auth.users where email = 'admin@creditcount.app');
 *
 * That is the SOW's "admin access is granted manually (there is no self-serve
 * admin sign-up)", enforced rather than merely followed.
 *
 * Safe to re-run: accounts that exist are signed into, and an account that
 * already has rides is left alone rather than doubled.
 *
 *   npm run seed:demo
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import type { Database } from '../lib/database.types'
import {
  FILLER_ACCOUNTS,
  RIDER_RIDES,
  RIVAL_RIDES,
  type DemoAccount,
  type DemoRide,
} from './demo-data'

config({ path: '.env.local' })

type Client = SupabaseClient<Database>

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    console.error(`Missing ${name}. Copy .env.example to .env.local and fill it in.`)
    process.exit(1)
  }
  return value
}

const SUPABASE_URL = required('SUPABASE_URL')
const SUPABASE_KEY = required('SUPABASE_PUBLISHABLE_KEY')

function anonClient(): Client {
  return createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function isoDaysAgo(days: number): string {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - days)
  return date.toISOString().slice(0, 10)
}

/** Sign in if the account exists, otherwise create it. */
async function signInOrSignUp(account: DemoAccount): Promise<{ client: Client; userId: string }> {
  const client = anonClient()

  const existing = await client.auth.signInWithPassword({
    email: account.email,
    password: account.password,
  })

  if (existing.data.user) {
    return { client, userId: existing.data.user.id }
  }

  const created = await client.auth.signUp({
    email: account.email,
    password: account.password,
    options: { data: { display_name: account.displayName } },
  })

  if (created.error) {
    throw new Error(`Could not create ${account.email}: ${created.error.message}`)
  }

  if (!created.data.session) {
    throw new Error(
      `Signed ${account.email} up but got no session back. Email confirmation is still enabled: ` +
        'turn it off in Supabase under Authentication, Sign In / Providers, Email.',
    )
  }

  return { client, userId: created.data.user!.id }
}

async function loadCatalogue(client: Client): Promise<Map<string, string>> {
  const { data, error } = await client.from('coasters').select('id, name, park')
  if (error) throw new Error(`Could not read the catalogue: ${error.message}`)

  const byKey = new Map<string, string>()
  for (const coaster of data ?? []) {
    byKey.set(`${coaster.name}|${coaster.park}`, coaster.id)
  }
  return byKey
}

async function seedAccount(account: DemoAccount): Promise<string> {
  const { client, userId } = await signInOrSignUp(account)

  // display_name is set by the handle_new_user trigger at sign-up; this keeps a
  // re-run idempotent if the name in demo-data.ts has since changed.
  const { error: profileError } = await client
    .from('profiles')
    .update({
      display_name: account.displayName,
      show_on_leaderboard: account.showOnLeaderboard,
    })
    .eq('id', userId)

  if (profileError) throw new Error(`Could not update ${account.email}: ${profileError.message}`)

  const { count } = await client
    .from('rides')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  if ((count ?? 0) > 0) {
    console.log(`  ${account.displayName.padEnd(8)} already has ${count} rides, left alone`)
    await client.auth.signOut()
    return userId
  }

  if (account.rides.length > 0) {
    const catalogue = await loadCatalogue(client)
    const rows = account.rides.map((ride: DemoRide) => {
      const coasterId = catalogue.get(`${ride.coaster}|${ride.park}`)
      if (!coasterId) {
        // Loud on purpose: a typo here would silently produce a thinner demo.
        throw new Error(`"${ride.coaster}" at "${ride.park}" is not in the catalogue.`)
      }
      return {
        user_id: userId,
        coaster_id: coasterId,
        ridden_on: isoDaysAgo(ride.daysAgo),
        note: ride.note ?? null,
      }
    })

    const { error } = await client.from('rides').insert(rows)
    if (error) throw new Error(`Could not log rides for ${account.email}: ${error.message}`)
  }

  const credits = new Set(account.rides.map((r) => `${r.coaster}|${r.park}`)).size
  console.log(
    `  ${account.displayName.padEnd(8)} ${String(account.rides.length).padStart(2)} rides, ` +
      `${String(credits).padStart(2)} credits, leaderboard ${account.showOnLeaderboard ? 'on' : 'off'}`,
  )

  await client.auth.signOut()
  return userId
}

async function main() {
  const accounts: DemoAccount[] = [
    {
      key: 'rider',
      email: required('DEMO_RIDER_EMAIL'),
      password: required('DEMO_RIDER_PASSWORD'),
      displayName: 'Sam Rider',
      showOnLeaderboard: true,
      rides: RIDER_RIDES,
    },
    {
      key: 'rival',
      email: required('DEMO_RIVAL_EMAIL'),
      password: required('DEMO_RIVAL_PASSWORD'),
      displayName: 'Rival Rider',
      showOnLeaderboard: false,
      rides: RIVAL_RIDES,
    },
    {
      key: 'admin',
      email: required('DEMO_ADMIN_EMAIL'),
      password: required('DEMO_ADMIN_PASSWORD'),
      displayName: 'Catalogue Admin',
      showOnLeaderboard: false,
      rides: [],
    },
    ...FILLER_ACCOUNTS.map((filler) => ({
      ...filler,
      // Filler accounts are never handed to anyone, so their password only has
      // to be unguessable and stable enough to re-run this script.
      password: `${filler.displayName}-filler-2026!`,
    })),
  ]

  console.log(`Seeding ${accounts.length} demo accounts against ${SUPABASE_URL}\n`)

  const ids: Record<string, string> = {}
  for (const account of accounts) {
    ids[account.key] = await seedAccount(account)
  }

  console.log('\nDone. One manual step remains, by design:\n')
  console.log("  update public.profiles set is_admin = true where id = '" + ids.admin + "';\n")
  console.log('Run it in the Supabase SQL editor. This script cannot do it, and neither can the app.')
}

main().catch((error: unknown) => {
  console.error(`\nSeed failed: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
