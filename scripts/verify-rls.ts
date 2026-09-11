/**
 * The negative security tests.
 *
 *   npm run verify:rls
 *
 * This is the acceptance criteria the SOW cares about most, run with the user
 * interface out of the way: "a second user cannot view, edit, or delete the
 * first user's rides through the interface OR THROUGH DIRECT API CALLS", and
 * "an enthusiast account cannot add, edit, or delete catalogue entries BY ANY
 * MEANS".
 *
 * It signs in as real accounts with the publishable key over PostgREST - the
 * same door a browser uses, and the same door an attacker would use. Nothing
 * here goes through the Next.js app, so nothing the app does can make a test
 * pass. Only the database can.
 *
 * Exits non-zero on the first failure so CI can gate on it.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import type { Database } from '../lib/database.types'

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

function newClient(): Client {
  return createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function signIn(emailVar: string, passwordVar: string): Promise<{ client: Client; id: string }> {
  const client = newClient()
  const { data, error } = await client.auth.signInWithPassword({
    email: required(emailVar),
    password: required(passwordVar),
  })
  if (error || !data.user) {
    throw new Error(`Could not sign in as ${process.env[emailVar]}: ${error?.message ?? 'no user'}`)
  }
  return { client, id: data.user.id }
}

// ---------------------------------------------------------------------------
// Tiny assertion harness. One line per check, PASS or FAIL, and a tally.
// ---------------------------------------------------------------------------

let passed = 0
const failures: string[] = []

async function check(label: string, run: () => Promise<string | null>) {
  let verdict: string | null
  try {
    verdict = await run()
  } catch (error) {
    verdict = error instanceof Error ? error.message : String(error)
  }

  if (verdict === null) {
    passed += 1
    console.log(`  PASS  ${label}`)
  } else {
    failures.push(label)
    console.log(`  FAIL  ${label}\n        ${verdict}`)
  }
}

const expectNoRows = (rows: unknown[] | null, error: { message: string } | null): string | null => {
  // Either answer is a pass: RLS filters the rows away, and a permission error
  // would also mean the data never left the database.
  if (error) return null
  if (!rows || rows.length === 0) return null
  return `expected no rows, got ${rows.length}`
}

const expectRejected = (error: { message: string } | null): string | null =>
  error ? null : 'expected the database to reject this, it succeeded'

// ---------------------------------------------------------------------------

async function main() {
  console.log(`\nVerifying Row Level Security against ${SUPABASE_URL}\n`)

  const rider = await signIn('DEMO_RIDER_EMAIL', 'DEMO_RIDER_PASSWORD')
  const rival = await signIn('DEMO_RIVAL_EMAIL', 'DEMO_RIVAL_PASSWORD')
  const admin = await signIn('DEMO_ADMIN_EMAIL', 'DEMO_ADMIN_PASSWORD')
  const visitor = newClient()

  // A ride belonging to the rider, fetched as the rider. Everything below tries
  // to reach this exact row from somewhere it should not be reachable.
  const { data: ownRides } = await rider.client
    .from('rides')
    .select('id, note')
    .eq('user_id', rider.id)
    .limit(1)

  const target = ownRides?.[0]
  if (!target) {
    console.error('The rider account has no rides. Run `npm run seed:demo` first.')
    process.exit(1)
  }

  const { data: adminIsAdmin } = await admin.client.rpc('is_admin')
  if (adminIsAdmin !== true) {
    console.error(
      'The admin account is not an admin yet. Run, in the Supabase SQL editor:\n' +
        "  update public.profiles set is_admin = true where id = '" + admin.id + "';",
    )
    process.exit(1)
  }

  console.log('One enthusiast against another enthusiast')

  await check('rival cannot read the rider\'s rides', async () => {
    const { data, error } = await rival.client.from('rides').select('*').eq('user_id', rider.id)
    return expectNoRows(data, error)
  })

  await check('rival cannot read the rider\'s ride by its id', async () => {
    const { data, error } = await rival.client.from('rides').select('*').eq('id', target.id)
    return expectNoRows(data, error)
  })

  await check('rival cannot edit the rider\'s ride', async () => {
    const { data, error } = await rival.client
      .from('rides')
      .update({ note: 'tampered' })
      .eq('id', target.id)
      .select()
    return expectNoRows(data, error)
  })

  await check('rival cannot delete the rider\'s ride', async () => {
    const { data, error } = await rival.client.from('rides').delete().eq('id', target.id).select()
    return expectNoRows(data, error)
  })

  await check('rival cannot read the rider\'s profile', async () => {
    const { data, error } = await rival.client.from('profiles').select('*').eq('id', rider.id)
    return expectNoRows(data, error)
  })

  await check('rival\'s own stats are their own, not the rider\'s', async () => {
    const { data } = await rival.client.rpc('get_my_stats')
    const stats = data as { credits: number } | null
    const { count } = await rival.client
      .from('rides')
      .select('coaster_id', { count: 'exact', head: true })
    if (!stats) return 'get_my_stats returned nothing'
    // SECURITY INVOKER: the function sees exactly what the caller can see.
    return (stats.credits ?? 0) <= (count ?? 0)
      ? null
      : `credits ${stats.credits} exceeds the caller's own ${count} rides`
  })

  console.log('\nAn enthusiast against the shared catalogue')

  await check('rival cannot add a coaster', async () => {
    const { error } = await rival.client.from('coasters').insert({
      name: 'Injected Coaster',
      park: 'Nowhere',
      country: 'Nowhere',
      manufacturer: 'Nobody',
      type: 'Steel',
    })
    return expectRejected(error)
  })

  await check('rival cannot edit a coaster', async () => {
    const { data, error } = await rival.client
      .from('coasters')
      .update({ name: 'Renamed by a non-admin' })
      .eq('name', 'Taron')
      .select()
    return expectNoRows(data, error)
  })

  await check('rival cannot delete a coaster', async () => {
    const { data, error } = await rival.client
      .from('coasters')
      .delete()
      .eq('name', 'Taron')
      .select()
    return expectNoRows(data, error)
  })

  console.log('\nPrivilege escalation')

  await check('rival cannot make themselves an admin', async () => {
    const { error } = await rival.client
      .from('profiles')
      .update({ is_admin: true })
      .eq('id', rival.id)
      .select()
    return expectRejected(error)
  })

  await check('the admin cannot promote anyone either', async () => {
    const { error } = await admin.client
      .from('profiles')
      .update({ is_admin: false })
      .eq('id', admin.id)
      .select()
    return expectRejected(error)
  })

  console.log('\nA signed-out visitor (FR1: the leaderboard and nothing else)')

  await check('visitor cannot read any rides', async () => {
    const { data, error } = await visitor.from('rides').select('*')
    return expectNoRows(data, error)
  })

  await check('visitor cannot read any profiles', async () => {
    const { data, error } = await visitor.from('profiles').select('*')
    return expectNoRows(data, error)
  })

  await check('visitor cannot read the catalogue', async () => {
    const { data, error } = await visitor.from('coasters').select('*')
    return expectNoRows(data, error)
  })

  await check('visitor cannot call get_my_stats', async () => {
    const { error } = await visitor.rpc('get_my_stats')
    return expectRejected(error)
  })

  await check('visitor cannot call search_coasters', async () => {
    const { error } = await visitor.rpc('search_coasters', { p_query: 'a' })
    return expectRejected(error)
  })

  await check('visitor CAN read the leaderboard, and it returns only three columns', async () => {
    const { data, error } = await visitor.rpc('get_leaderboard')
    if (error) return `the leaderboard should be public: ${error.message}`
    if (!data || data.length === 0) return 'the leaderboard came back empty'

    const keys = Object.keys(data[0]).sort().join(',')
    return keys === 'credits,display_name,rank'
      ? null
      : `expected rank, display_name and credits only, got: ${keys}`
  })

  await check('the windowed leaderboard leaks no extra columns either', async () => {
    for (const window of ['day', 'week', 'month', 'all', 'nonsense']) {
      const { data, error } = await visitor.rpc('get_leaderboard', { p_window: window })
      if (error) return `window "${window}" failed: ${error.message}`
      if (data && data.length > 0) {
        const keys = Object.keys(data[0]).sort().join(',')
        if (keys !== 'credits,display_name,rank') return `window "${window}" returned: ${keys}`
      }
    }
    return null
  })

  await check('the leaderboard never lists an opted-out rider', async () => {
    const { data } = await visitor.rpc('get_leaderboard')
    const { data: rivalProfile } = await rival.client
      .from('profiles')
      .select('display_name, show_on_leaderboard')
      .eq('id', rival.id)
      .single()

    if (!rivalProfile || rivalProfile.show_on_leaderboard) {
      return 'the rival account is opted in, so this check proves nothing'
    }
    return (data ?? []).some((row) => row.display_name === rivalProfile.display_name)
      ? 'an opted-out rider is on the leaderboard'
      : null
  })

  console.log('\nThe admin is a catalogue role, not a superuser')

  await check('the admin cannot read the rider\'s rides', async () => {
    const { data, error } = await admin.client.from('rides').select('*').eq('user_id', rider.id)
    return expectNoRows(data, error)
  })

  await check('the admin cannot read the rider\'s ride by its id', async () => {
    const { data, error } = await admin.client.from('rides').select('*').eq('id', target.id)
    return expectNoRows(data, error)
  })

  await check('the admin cannot read the rider\'s profile', async () => {
    const { data, error } = await admin.client.from('profiles').select('*').eq('id', rider.id)
    return expectNoRows(data, error)
  })

  await check('the admin CAN add and remove a catalogue entry', async () => {
    const probe = {
      name: `Verification Probe ${Date.now()}`,
      park: 'Verification Park',
      country: 'Testland',
      manufacturer: 'Verifier',
      type: 'Steel',
    }
    const { data, error } = await admin.client.from('coasters').insert(probe).select('id').single()
    if (error || !data) return `the admin could not add a coaster: ${error?.message}`

    const { error: cleanup } = await admin.client.from('coasters').delete().eq('id', data.id)
    return cleanup ? `the admin could not clean up: ${cleanup.message}` : null
  })

  console.log('\nData integrity')

  await check('a ride cannot be logged in the future', async () => {
    const future = new Date()
    future.setUTCDate(future.getUTCDate() + 7)

    const { data: coaster } = await rider.client.from('coasters').select('id').limit(1).single()
    if (!coaster) return 'the catalogue is empty'

    const { error } = await rider.client.from('rides').insert({
      user_id: rider.id,
      coaster_id: coaster.id,
      ridden_on: future.toISOString().slice(0, 10),
    })
    return expectRejected(error)
  })

  await check('a ride cannot be logged on behalf of someone else', async () => {
    const { data: coaster } = await rival.client.from('coasters').select('id').limit(1).single()
    if (!coaster) return 'the catalogue is empty'

    const { error } = await rival.client.from('rides').insert({
      user_id: rider.id, // forged
      coaster_id: coaster.id,
      ridden_on: new Date().toISOString().slice(0, 10),
    })
    return expectRejected(error)
  })

  await Promise.all([
    rider.client.auth.signOut(),
    rival.client.auth.signOut(),
    admin.client.auth.signOut(),
  ])

  const total = passed + failures.length
  console.log(`\n${passed}/${total} checks passed`)

  if (failures.length > 0) {
    console.log('\nFailed:')
    for (const failure of failures) console.log(`  - ${failure}`)
    process.exit(1)
  }
}

main().catch((error: unknown) => {
  console.error(`\nverify:rls could not run: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
