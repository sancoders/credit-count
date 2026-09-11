import Link from 'next/link'
import { LogRideForm } from '@/components/LogRideForm'
import { Banner, BreakdownList, Card, EmptyState, MetricCard, formatDate } from '@/components/ui'
import { todayISO } from '@/lib/actions/shared'
import { requireViewer } from '@/lib/auth'
import type { UserStats } from '@/lib/database.types'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Dashboard · Credit Count' }

/*
  Ride logging is driven by the URL rather than by client state: `?q=` holds
  the search and `?pick=` the chosen coaster. That keeps the page a Server
  Component, and it makes FR2 countable instead of arguable - each of the three
  interactions is one visible step.

  Stats come from get_my_stats(), a SECURITY INVOKER function, so RLS is
  evaluated inside it and it cannot return another user's rides. They are
  recomputed on every render and logRide revalidates this path, so they update
  with no manual refresh step (FR5).
*/

const EMPTY_STATS: UserStats = {
  credits: 0,
  rides: 0,
  by_country: [],
  by_manufacturer: [],
  by_type: [],
  most_ridden: null,
}

export default async function DashboardPage({ searchParams }: PageProps<'/dashboard'>) {
  const params = await searchParams
  const query = typeof params.q === 'string' ? params.q.slice(0, 60) : ''
  const pickedId = typeof params.pick === 'string' ? params.pick : ''
  const justLogged = params.logged === '1'

  const { userId, profile } = await requireViewer()
  const supabase = await createClient()
  const today = todayISO()

  const [statsResult, searchResult, recentResult] = await Promise.all([
    supabase.rpc('get_my_stats'),
    supabase.rpc('search_coasters', { p_query: query, p_limit: 8 }),
    supabase
      .from('rides')
      .select('id, ridden_on, note, coasters ( name, park, country )')
      // RLS already limits this to the caller's rows; the filter is a second lock.
      .eq('user_id', userId)
      .order('ridden_on', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const stats = (statsResult.data as UserStats | null) ?? EMPTY_STATS
  const results = searchResult.data ?? []
  const recent = recentResult.data ?? []
  const picked = pickedId ? results.find((c) => c.id === pickedId) : undefined

  const searchHref = (extra: Record<string, string>) => {
    const usp = new URLSearchParams()
    if (query) usp.set('q', query)
    for (const [key, value] of Object.entries(extra)) usp.set(key, value)
    const qs = usp.toString()
    return qs ? `/dashboard?${qs}` : '/dashboard'
  }

  return (
    <div className="space-y-7 sm:space-y-9">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div className="page-intro">
          <p className="section-kicker">Your ride desk</p>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.045em] sm:text-4xl">
            Hello, {profile.display_name}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={`status-pill ${profile.show_on_leaderboard ? '' : 'status-pill--muted'}`}>
              <span aria-hidden="true">{profile.show_on_leaderboard ? '●' : '○'}</span>
              {profile.show_on_leaderboard ? 'Visible on the public board' : 'Private from the public board'}
            </span>
            <Link href="/settings" className="text-xs font-bold text-accent hover:text-accent-deep">
              Manage privacy
            </Link>
          </div>
        </div>
        <p className="max-w-sm text-sm leading-6 text-muted">
          Your numbers update as you log. A repeat ride grows your ride total; a new coaster grows
          your credits.
        </p>
      </section>

      {justLogged && <Banner tone="success">Ride logged. Your numbers are up to date.</Banner>}

      <section className="grid gap-5 lg:grid-cols-12 lg:items-start">
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-2">
          <MetricCard
            featured
            label="Credits"
            value={stats.credits}
            detail="Unique coasters ridden"
          />
          <MetricCard label="Rides" value={stats.rides} detail="Every ride, repeats included" />
          <div className="sm:col-span-2">
            <MetricCard
              label="Most ridden"
              value={
                stats.most_ridden ? (
                  <span className="block truncate text-xl font-bold tracking-[-0.04em]" title={stats.most_ridden.name}>
                    {stats.most_ridden.name}
                  </span>
                ) : (
                  '—'
                )
              }
              detail={
                stats.most_ridden
                  ? `${stats.most_ridden.park} · ${stats.most_ridden.rides} ${
                      stats.most_ridden.rides === 1 ? 'ride' : 'rides'
                    }`
                  : 'Log a ride to find out.'
              }
            />
          </div>
        </div>

        <section className="quick-log lg:col-span-7" aria-labelledby="quick-log-heading">
          <div className="quick-log__content">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="section-kicker">Fast entry</p>
                <h2 id="quick-log-heading" className="mt-2 text-xl font-bold tracking-tight">
                  Log a ride
                </h2>
                <p className="mt-1 text-xs leading-5 text-muted">
                  Find it, choose it, log it. Re-rides are welcome.
                </p>
              </div>
              <div className="quick-log__steps" aria-label="Three-step ride logging flow">
                <span>1 Search</span>
                <span>2 Choose</span>
                <span>3 Log</span>
              </div>
            </div>

            <form method="get" action="/dashboard" className="mt-5 flex flex-col gap-2 sm:flex-row">
              <label className="sr-only" htmlFor="coaster-search">
                Search the coaster catalogue
              </label>
              <input
                id="coaster-search"
                type="search"
                name="q"
                defaultValue={query}
                autoFocus
                maxLength={60}
                className="field flex-1"
                placeholder="Search by coaster or park…"
                aria-label="Search the coaster catalogue"
              />
              <button type="submit" className="btn btn-secondary">
                Search
              </button>
            </form>

            {results.length === 0 ? (
              <div className="mt-4">
                <EmptyState title={query ? `No coasters match “${query}”.` : 'Start with a coaster or park name.'}>
                  {query
                    ? 'Try a park name instead, or ask an admin to add it to the catalogue.'
                    : 'Search the shared catalogue to make your next ride entry.'}
                </EmptyState>
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {results.map((coaster) => {
                  const isPicked = coaster.id === pickedId
                  return (
                    <li
                      key={coaster.id}
                      className={`coaster-result ${isPicked ? 'coaster-result--picked' : ''}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold">{coaster.name}</p>
                          <p className="truncate text-xs leading-5 text-muted">
                            {coaster.park} · {coaster.country} · {coaster.manufacturer} · {coaster.type}
                          </p>
                        </div>

                        {/* Interaction 2: pick the coaster. */}
                        <Link
                          href={isPicked ? searchHref({}) : searchHref({ pick: coaster.id })}
                          scroll={false}
                          className={isPicked ? 'btn btn-ghost text-xs' : 'btn btn-secondary text-xs'}
                        >
                          {isPicked ? 'Cancel' : 'Choose'}
                        </Link>
                      </div>

                      {/* Interaction 3: submit. Date is already today. */}
                      {isPicked && picked && (
                        <div className="mt-3">
                          <LogRideForm coaster={picked} today={today} />
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>
      </section>

      <section aria-labelledby="stats-heading">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="section-kicker">The shape of your count</p>
            <h2 id="stats-heading" className="mt-2 text-xl font-bold tracking-tight">
              Credit breakdowns
            </h2>
          </div>
          <p className="text-xs text-muted">Unique coasters, grouped by catalogue detail.</p>
        </div>
        <div className="stats-grid">
          <Card title="By country">
            <BreakdownList rows={stats.by_country} />
          </Card>
          <Card title="By manufacturer">
            <BreakdownList rows={stats.by_manufacturer} />
          </Card>
          <Card title="By type">
            <BreakdownList rows={stats.by_type} />
          </Card>
        </div>
      </section>

      <Card
        title="Recent rides"
        description="Your private log, newest first."
        action={
          <Link href="/rides" className="text-xs font-bold text-accent hover:text-accent-deep">
            View all rides →
          </Link>
        }
      >
        {recent.length === 0 ? (
          <EmptyState title="No rides logged yet.">
            Your first one is three simple steps away, just above.
          </EmptyState>
        ) : (
          <ul className="ride-timeline space-y-1">
            {recent.map((ride) => (
              <li key={ride.id} className="ride-timeline__item flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 py-2.5">
                <span className="ride-timeline__dot" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{ride.coasters?.name}</p>
                  <p className="truncate text-xs leading-5 text-muted">
                    {ride.coasters?.park}
                    {ride.note ? ` · ${ride.note}` : ''}
                  </p>
                </div>
                <span className="shrink-0 text-xs tabular-nums text-muted">{formatDate(ride.ridden_on)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
