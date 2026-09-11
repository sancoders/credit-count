'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { field, firstIssue, withError, type ActionState } from './shared'

/**
 * Catalogue management.
 *
 * requireAdmin() here decides what a non-admin sees, not whether the write
 * succeeds. The coasters_admin_write policy is what actually stops it: an
 * enthusiast posting directly to these actions is rejected by Postgres, which
 * is what the SOW means by "this must hold at the database layer, not only in
 * the interface". scripts/verify-rls.ts proves it with the UI out of the way.
 */

const text = (label: string, max: number) =>
  z.string().trim().min(1, `${label} is required.`).max(max, `${label} is too long.`)

const coasterSchema = z.object({
  name: text('Name', 120),
  park: text('Park', 120),
  country: text('Country', 80),
  manufacturer: text('Manufacturer', 80),
  type: z.enum(['Steel', 'Wooden', 'Hybrid'], 'Choose Steel, Wooden or Hybrid.'),
})

function readCoaster(formData: FormData) {
  return coasterSchema.safeParse({
    name: field(formData, 'name'),
    park: field(formData, 'park'),
    country: field(formData, 'country'),
    manufacturer: field(formData, 'manufacturer'),
    type: field(formData, 'type'),
  })
}

export async function createCoaster(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin()

  const parsed = readCoaster(formData)
  if (!parsed.success) return { error: firstIssue(parsed.error) }

  const supabase = await createClient()
  const { error } = await supabase.from('coasters').insert(parsed.data)

  if (error) {
    // 23505 is the unique (name, park) constraint: the guard against the
    // duplicate entries the SOW flags as a data-quality risk.
    return {
      error:
        error.code === '23505'
          ? `${parsed.data.name} at ${parsed.data.park} is already in the catalogue.`
          : 'That coaster could not be added.',
    }
  }

  revalidatePath('/admin')
  revalidatePath('/dashboard')
  redirect('/admin?added=1')
}

export async function updateCoaster(formData: FormData): Promise<void> {
  await requireAdmin()

  const id = z.uuid().safeParse(field(formData, 'coasterId'))
  if (!id.success) redirect(withError('/admin', 'That coaster does not exist.'))

  const parsed = readCoaster(formData)
  if (!parsed.success) redirect(withError('/admin', firstIssue(parsed.error)))

  const supabase = await createClient()
  const { error } = await supabase.from('coasters').update(parsed.data).eq('id', id.data)

  if (error) {
    redirect(
      withError(
        '/admin',
        error.code === '23505'
          ? 'Another catalogue entry already uses that name and park.'
          : 'That coaster could not be updated.',
      ),
    )
  }

  revalidatePath('/admin')
  revalidatePath('/dashboard')
  redirect('/admin?updated=1')
}

/**
 * Remove a coaster.
 *
 * Try the hard delete and let the database answer. rides.coaster_id is
 * ON DELETE RESTRICT, so if anybody has logged a ride on it Postgres raises
 * 23503 and the row is deactivated instead: it leaves the catalogue and the
 * search, and every existing ride keeps counting.
 *
 * This is deliberately not "count the rides first, then choose". That version
 * races: a ride logged between the count and the delete would either be
 * orphaned or blow up. Here the constraint is the decision.
 */
export async function removeCoaster(formData: FormData): Promise<void> {
  await requireAdmin()

  const id = z.uuid().safeParse(field(formData, 'coasterId'))
  if (!id.success) redirect(withError('/admin', 'That coaster does not exist.'))

  const supabase = await createClient()
  const { error } = await supabase.from('coasters').delete().eq('id', id.data)

  let outcome = 'deleted'
  if (error) {
    if (error.code !== '23503') {
      redirect(withError('/admin', 'That coaster could not be removed.'))
    }
    const { error: deactivateError } = await supabase
      .from('coasters')
      .update({ is_active: false })
      .eq('id', id.data)

    if (deactivateError) redirect(withError('/admin', 'That coaster could not be removed.'))
    outcome = 'deactivated'
  }

  revalidatePath('/admin')
  revalidatePath('/dashboard')
  redirect(`/admin?removed=${outcome}`)
}

export async function restoreCoaster(formData: FormData): Promise<void> {
  await requireAdmin()

  const id = z.uuid().safeParse(field(formData, 'coasterId'))
  if (!id.success) redirect(withError('/admin', 'That coaster does not exist.'))

  const supabase = await createClient()
  const { error } = await supabase.from('coasters').update({ is_active: true }).eq('id', id.data)

  if (error) redirect(withError('/admin', 'That coaster could not be restored.'))

  revalidatePath('/admin')
  revalidatePath('/dashboard')
  redirect('/admin?restored=1')
}
