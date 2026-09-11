import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/database.types'

/**
 * The only Supabase client in this application.
 *
 * It carries the signed-in user's session, so every query is subject to Row
 * Level Security. There is no service-role client anywhere in the codebase:
 * the app cannot read data its user could not read directly, which means the
 * policies in supabase/migrations/0002_security.sql are the whole boundary.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(env('SUPABASE_URL'), env('SUPABASE_PUBLISHABLE_KEY'), {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Server Components cannot write cookies. Session refresh happens in
          // proxy.ts, which can, so ignoring this is safe rather than silent.
        }
      },
    },
  })
}

function env(name: 'SUPABASE_URL' | 'SUPABASE_PUBLISHABLE_KEY'): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env.local and fill it in, or set it in the Vercel project.`,
    )
  }
  return value
}
