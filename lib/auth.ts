import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type Profile = {
  id: string
  display_name: string
  is_admin: boolean
  show_on_leaderboard: boolean
}

/**
 * The signed-in user and their profile, or null.
 *
 * Always uses getUser(), never getSession(): getSession reads the cookie as-is,
 * getUser revalidates the token with Supabase Auth.
 */
export async function getViewer(): Promise<{ userId: string; profile: Profile } | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, is_admin, show_on_leaderboard')
    .eq('id', user.id)
    .single()

  if (!profile) return null
  return { userId: user.id, profile }
}

/**
 * For pages and Server Actions that require a session.
 *
 * proxy.ts already redirects signed-out visitors away from these routes, but
 * that is an optimistic check on a cookie. Server Actions are reachable by
 * direct POST and never pass through a page, so authorisation is re-checked
 * here, at the point of use.
 */
export async function requireViewer() {
  const viewer = await getViewer()
  if (!viewer) redirect('/login')
  return viewer
}

/**
 * For the admin area. The database rejects catalogue writes from a non-admin
 * regardless of what the UI does - this only decides what to render and keeps
 * the failure legible instead of surfacing a policy error.
 */
export async function requireAdmin() {
  const viewer = await requireViewer()
  if (!viewer.profile.is_admin) redirect('/dashboard')
  return viewer
}
