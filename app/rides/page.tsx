import Link from 'next/link'
import { Banner, Card, EmptyState, formatDate } from '@/components/ui'
import { deleteRide, updateRide } from '@/lib/actions/rides'
import { todayISO } from '@/lib/actions/shared'
import { requireViewer } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'My rides · Credit Count' }

/*
  Ride history: every ride the signed-in user has logged, newest first,
  editable and deletable by them and nobody else (FR9).

  The query carries no user filter beyond the defensive one - there is no
  "whose rides" parameter anywhere in this page, because rides_select_own
  already answers that question in Postgres. Another user's ride id in the
  edit link resolves to nothing.
*/

export default async function RidesPage({ searchParams }: PageProps<'/rides'>) {
  const params = await searchParams
  const editingId = typeof params.edit === 'string' ? params.edit : ''
  const error = typeof params.error === 'string' ? params.error : ''

  const { userId } = await requireViewer()
  const supabase = await createClient()
  const today = todayISO()

  const { data } = await supabase
    .from('rides')
    .select('id, ridden_on, note, coasters ( name, park, country, manufacturer, type )')
    .eq('user_id', userId)
    .order('ridden_on', { ascending: false })
    .order('created_at', { ascending: false })

  const rides = data ?? []

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">My rides</h1>
        <p className="mt-0.5 text-sm text-muted">
          {rides.length === 0
            ? 'Nothing logged yet.'
            : `${rides.length} ${rides.length === 1 ? 'ride' : 'rides'}, newest first. Only you can see this page.`}
        </p>
      </div>

      {error && <Banner tone="error">{error}</Banner>}

      <Card>
        {rides.length === 0 ? (
          <EmptyState title="No rides yet.">
            Head to the{' '}
            <Link href="/dashboard" className="font-medium text-accent">
              dashboard
            </Link>{' '}
            to log your first one.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-border">
            {rides.map((ride) => {
              const isEditing = ride.id === editingId
              return (
                <li key={ride.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{ride.coasters?.name}</p>
                      <p className="text-xs text-muted">
                        {ride.coasters?.park} · {ride.coasters?.country} ·{' '}
                        {ride.coasters?.manufacturer} · {ride.coasters?.type}
                      </p>
                      {ride.note && !isEditing && (
                        <p className="mt-1 text-sm text-foreground/80">{ride.note}</p>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-xs tabular-nums text-muted">
                        {formatDate(ride.ridden_on)}
                      </span>
                      <Link
                        href={isEditing ? '/rides' : `/rides?edit=${ride.id}`}
                        scroll={false}
                        className="btn btn-secondary text-xs"
                      >
                        {isEditing ? 'Cancel' : 'Edit'}
                      </Link>
                      <form action={deleteRide}>
                        <input type="hidden" name="rideId" value={ride.id} />
                        <button type="submit" className="btn btn-ghost text-xs text-danger">
                          Delete
                        </button>
                      </form>
                    </div>
                  </div>

                  {isEditing && (
                    <form
                      action={updateRide}
                      className="mt-3 flex flex-wrap items-end gap-3 rounded-lg bg-accent-soft/60 p-3"
                    >
                      <input type="hidden" name="rideId" value={ride.id} />
                      <div className="w-40">
                        <label
                          htmlFor={`date-${ride.id}`}
                          className="mb-1 block text-xs font-medium"
                        >
                          Date ridden
                        </label>
                        <input
                          id={`date-${ride.id}`}
                          name="riddenOn"
                          type="date"
                          className="field"
                          defaultValue={ride.ridden_on}
                          max={today}
                          required
                        />
                      </div>
                      <div className="min-w-52 flex-1">
                        <label
                          htmlFor={`note-${ride.id}`}
                          className="mb-1 block text-xs font-medium"
                        >
                          Note <span className="font-normal text-muted">(optional)</span>
                        </label>
                        <input
                          id={`note-${ride.id}`}
                          name="note"
                          className="field"
                          maxLength={280}
                          defaultValue={ride.note ?? ''}
                          placeholder="Front row, night ride…"
                        />
                      </div>
                      <button type="submit" className="btn btn-primary">
                        Save changes
                      </button>
                    </form>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}
