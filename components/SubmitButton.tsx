'use client'

import { useFormStatus } from 'react-dom'

/**
 * A submit button that disables itself while its form is in flight.
 *
 * Cosmetic only. It stops a double-click logging the same ride twice on a slow
 * connection, but nothing about correctness depends on it - every action
 * re-checks the session and the database enforces the rest.
 */
export function SubmitButton({
  children,
  pendingLabel,
  className = 'btn btn-primary',
}: {
  children: React.ReactNode
  pendingLabel?: string
  className?: string
}) {
  const { pending } = useFormStatus()

  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {pending ? (pendingLabel ?? 'Working…') : children}
    </button>
  )
}
