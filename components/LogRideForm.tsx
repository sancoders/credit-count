'use client'

import { useActionState } from 'react'
import { logRide } from '@/lib/actions/rides'
import { Banner } from './ui'
import { SubmitButton } from './SubmitButton'

/**
 * Step three of three.
 *
 * FR2 caps logging a ride at three interactions from the dashboard: type in
 * the search box, click the coaster, submit this form. The date is already
 * filled in with today and the note is optional, so nothing else is required
 * before the third click.
 */
export function LogRideForm({
  coaster,
  today,
}: {
  coaster: { id: string; name: string; park: string; country: string }
  today: string
}) {
  const [state, action] = useActionState(logRide, {})

  return (
    <form action={action} className="space-y-3">
      {state.error && <Banner tone="error">{state.error}</Banner>}

      <input type="hidden" name="coasterId" value={coaster.id} />

      <div className="flex flex-wrap gap-3">
        <div className="w-40">
          <label htmlFor="riddenOn" className="mb-1 block text-xs font-medium">
            Date ridden
          </label>
          <input
            id="riddenOn"
            name="riddenOn"
            type="date"
            className="field"
            defaultValue={today}
            max={today}
            required
          />
        </div>

        <div className="min-w-52 flex-1">
          <label htmlFor="note" className="mb-1 block text-xs font-medium">
            Note <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            id="note"
            name="note"
            className="field"
            maxLength={280}
            placeholder="Front row, night ride…"
          />
        </div>
      </div>

      <SubmitButton pendingLabel="Logging…">Log ride</SubmitButton>
    </form>
  )
}
