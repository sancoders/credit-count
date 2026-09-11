'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireViewer } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { displayNameField, field, firstIssue, withError } from './shared'

export async function updateDisplayName(formData: FormData): Promise<void> {
  const { userId } = await requireViewer()

  const parsed = displayNameField.safeParse(field(formData, 'displayName'))
  if (!parsed.success) redirect(withError('/settings', firstIssue(parsed.error)))

  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ display_name: parsed.data })
    .eq('id', userId)

  if (error) redirect(withError('/settings', 'That name could not be saved.'))

  revalidatePath('/settings')
  revalidatePath('/')
  redirect('/settings?saved=name')
}

/**
 * Flip the public leaderboard opt-in.
 *
 * FR7 requires opting out to take effect immediately. get_leaderboard filters
 * on show_on_leaderboard at read time and every page that renders it is
 * dynamic, so the next load is already correct - there is no cached copy of
 * the leaderboard that could keep someone visible after they opted out.
 *
 * Note that is_admin is not touched here. A trigger in the database rejects
 * any change to it that comes from an application session, so this action
 * could not escalate a user even if it tried to.
 */
export async function setLeaderboardVisibility(formData: FormData): Promise<void> {
  const { userId } = await requireViewer()
  const show = field(formData, 'show') === 'true'

  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ show_on_leaderboard: show })
    .eq('id', userId)

  if (error) redirect(withError('/settings', 'That setting could not be saved.'))

  revalidatePath('/settings')
  revalidatePath('/')
  redirect(`/settings?saved=${show ? 'shown' : 'hidden'}`)
}
