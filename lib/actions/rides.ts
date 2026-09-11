'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireViewer } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { field, firstIssue, todayISO, withError, type ActionState } from './shared'

const noteField = z
  .string()
  .trim()
  .max(280, 'A note is limited to 280 characters.')
  .transform((value) => (value.length > 0 ? value : null))

const riddenOnField = z
  .iso
  .date('Enter a valid date.')
  .refine((value) => value <= todayISO(), 'A ride cannot be logged in the future.')

const rideSchema = z.object({
  coasterId: z.uuid('Choose a coaster from the catalogue.'),
  riddenOn: riddenOnField,
  note: noteField,
})

/**
 * Log one ride.
 *
 * Server Actions are reachable by direct POST, not only through the form, so
 * this re-checks the session rather than trusting that proxy.ts already did.
 *
 * user_id is taken from the verified session and never from the form. Even if
 * a caller forged one, the rides_insert_own policy checks
 * `auth.uid() = user_id` and the row would be rejected by Postgres.
 */
export async function logRide(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { userId } = await requireViewer()

  const parsed = rideSchema.safeParse({
    coasterId: field(formData, 'coasterId'),
    riddenOn: field(formData, 'riddenOn'),
    note: field(formData, 'note'),
  })
  if (!parsed.success) return { error: firstIssue(parsed.error) }

  const supabase = await createClient()
  const { error } = await supabase.from('rides').insert({
    user_id: userId,
    coaster_id: parsed.data.coasterId,
    ridden_on: parsed.data.riddenOn,
    note: parsed.data.note,
  })

  if (error) {
    return { error: 'That ride could not be saved. Please try again.' }
  }

  revalidatePath('/dashboard')
  revalidatePath('/rides')
  revalidatePath('/')
  redirect('/dashboard?logged=1')
}

const updateSchema = z.object({
  rideId: z.uuid('That ride does not exist.'),
  riddenOn: riddenOnField,
  note: noteField,
})

export async function updateRide(formData: FormData): Promise<void> {
  const { userId } = await requireViewer()

  const parsed = updateSchema.safeParse({
    rideId: field(formData, 'rideId'),
    riddenOn: field(formData, 'riddenOn'),
    note: field(formData, 'note'),
  })
  if (!parsed.success) redirect(withError('/rides', firstIssue(parsed.error)))

  const supabase = await createClient()
  // The user_id filter is a second lock. rides_update_own already restricts
  // this to the caller's own rows; someone else's id simply matches nothing.
  const { error } = await supabase
    .from('rides')
    .update({ ridden_on: parsed.data.riddenOn, note: parsed.data.note })
    .eq('id', parsed.data.rideId)
    .eq('user_id', userId)

  if (error) redirect(withError('/rides', 'That ride could not be updated.'))

  revalidatePath('/dashboard')
  revalidatePath('/rides')
  revalidatePath('/')
  redirect('/rides')
}

export async function deleteRide(formData: FormData): Promise<void> {
  const { userId } = await requireViewer()

  const rideId = z.uuid().safeParse(field(formData, 'rideId'))
  if (!rideId.success) redirect(withError('/rides', 'That ride does not exist.'))

  const supabase = await createClient()
  const { error } = await supabase
    .from('rides')
    .delete()
    .eq('id', rideId.data)
    .eq('user_id', userId)

  if (error) redirect(withError('/rides', 'That ride could not be deleted.'))

  revalidatePath('/dashboard')
  revalidatePath('/rides')
  revalidatePath('/')
  redirect('/rides')
}
