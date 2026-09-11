import { z } from 'zod'

/** Returned by the Server Actions that feed a `useActionState` form. */
export type ActionState = { error?: string }

export const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('Enter a valid email address.'))

export const passwordField = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(72, 'Password must be 72 characters or fewer.')

export const displayNameField = z
  .string()
  .trim()
  .min(2, 'Display name must be at least 2 characters.')
  .max(40, 'Display name must be 40 characters or fewer.')

/** Today in UTC, which is what `current_date` resolves to in the database. */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Reads a FormData field as a string, so Zod always sees the type it expects. */
export function field(formData: FormData, name: string): string {
  const value = formData.get(name)
  return typeof value === 'string' ? value : ''
}

/** The first validation message, which is the one worth showing a user. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'That input is not valid.'
}

/**
 * Builds a redirect target that carries an error back to a server-rendered
 * page. Used by the forms that do not need to preserve typed input; the ones
 * that do use `useActionState` and return an ActionState instead.
 */
export function withError(path: string, message: string): string {
  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}error=${encodeURIComponent(message)}`
}
