import Link from 'next/link'
import { LogRideForm } from '@/components/LogRideForm'
import { Banner, BreakdownList, Card, EmptyState, formatDate } from '@/components/ui'
import { todayISO } from '@/lib/actions/shared'
import { requireViewer } from '@/lib/auth'
import type { UserStats } from '@/lib/database.types'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Dashboard · Credit Count' }

/*
  The dashboard.

  Ride logging is driven by the URL rather than by client state: `?q=` holds
  the search and `?pick=` the chosen coaster. That keeps the page a Server
  Component, and it makes FR2 countable instead of arguable - each of the three
  interactions is one visible step.

  Stats come from get_my_stats(), a SECURITY INVOKER function, so Row Level
  Security is evaluated inside it and it cannot return another user's rides.
  They are recomputed on every render and logRide revalidates this path, so
  they update with no manual refresh step (FR5).
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Hello, {profile.display_name}
          </h1>
          <p className="mt-0.5 text-sm text-muted">
            {profile.show_on_leaderboard
              ? 'You are visible on the public leaderboard.'
              : 'You are not on the public leaderboard.'}{' '}
            <Link href="/settings" className="font-medium text-accent">
              Change
            </Link>
          </p>
        </div>
      </div>

      {justLogged && <Banner tone="success">Ride logged. Your numbers are up to date.</Banner>}

      {/* Headline numbers: credits is the number that matters (FR4). */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Credits</p>
          <p className="mt-1 text-4xl font-semibold tabular-nums">{stats.credits}</p>
          <p className="mt-1 text-xs text-muted">Unique coasters ridden</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Rides</p>
          <p className="mt-1 text-4xl font-semibold tabular-nums">{stats.rides}</p>
          <p className="mt-1 text-xs text-muted">Every ride, repeats included</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Most ridden</p>
          {stats.most_ridden ? (
            <>
              <p className="mt-1 truncate text-lg font-semibold" title={stats.most_ridden.name}>
                {stats.most_ridden.name}
              </p>
              <p className="mt-1 text-xs text-muted">
                {stats.most_ridden.park} · {stats.most_ridden.rides}{' '}
                {stats.most_ridden.rides === 1 ? 'ride' : 'rides'}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted">Log a ride to find out.</p>
          )}
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Log a ride. Interaction 1: the search box, always visible here.   */}
      {/* ---------------------------------------------------------------- */}
      <Card
        title="Log a ride"
        description="Search the catalogue, pick a coaster, save. Riding one again counts towards rides, not credits."
      >
        <form method="get" action="/dashboard" className="flex gap-2">
          <input
            type="search"
            name="q"
            defaultValue={query}
            autoFocus
            maxLength={60}
            className="field"
            placeholder="Search by coaster or park…"
            aria-label="Search the coaster catalogue"
          />
          <button type="submit" className="btn btn-secondary">
            Search
          </button>
        </form>

        {results.length === 0 ? (
          <div className="mt-4">
            <EmptyState title={`No coasters match “${query}”.`}>
              Try a park name instead, or ask an admin to add it to the catalogue.
            </EmptyState>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {results.map((coaster) => {
              const isPicked = coaster.id === pickedId
              return (
                <li key={coaster.id} className="py-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{coaster.name}</p>
                      <p className="truncate text-xs text-muted">
                        {coaster.park} · {coaster.country} · {coaster.manufacturer} ·{' '}
                        {coaster.type}
                      </p>
                    </div>

                    {/* Interaction 2: pick the coaster. */}
                    <Link
                      href={isPicked ? searchHref({}) : searchHref({ pick: coaster.id })}
                      scroll={false}
                      className={isPicked ? 'btn btn-ghost' : 'btn btn-secondary'}
                    >
                      {isPicked ? 'Cancel' : 'Log ride'}
                    </Link>
                  </div>

                  {/* Interaction 3: submit. Date is already today. */}
                  {isPicked && picked && (
                    <div className="mt-3 rounded-lg bg-accent-soft/60 p-3">
                      <LogRideForm coaster={picked} today={today} />
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Credits by country">
          <BreakdownList rows={stats.by_country} />
        </Card>
        <Card title="Credits by manufacturer">
          <BreakdownList rows={stats.by_manufacturer} />
        </Card>
        <Card title="Credits by type">
          <BreakdownList rows={stats.by_type} />
        </Card>
      </div>

      <Card
        title="Recent rides"
        action={
          <Link href="/rides" className="text-xs font-medium text-accent">
            All rides
          </Link>
        }
      >
        {recent.length === 0 ? (
          <EmptyState title="No rides logged yet.">
            Your first one is three clicks away, up there.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-border">
            {recent.map((ride) => (
              <li key={ride.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{ride.coasters?.name}</p>
                  <p className="truncate text-xs text-muted">
                    {ride.coasters?.park}
                    {ride.note ? ` · ${ride.note}` : ''}
                  </p>
                </div>
                <span className="text-xs tabular-nums text-muted">
                  {formatDate(ride.ridden_on)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
