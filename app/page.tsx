import Link from 'next/link'
import { Banner, EmptyState } from '@/components/ui'
import { getViewer } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

/*
  The public leaderboard. This is the one page a signed-out visitor can see,
  along with sign-up and sign-in (FR1).

  It reads through get_leaderboard(), a SECURITY DEFINER function granted to
  the anon role that returns rank, display name and credit count and nothing
  else. It is structurally incapable of revealing which coasters anyone has
  ridden, because those columns are not in its return type (FR7).

  Note what is missing: there is no "this is you" highlight. The function
  deliberately returns no user id, and display names are not unique, so the
  only way to mark your own row would be to match on name - which would
  sometimes mark somebody else.
*/

const WINDOWS = [
  { key: 'all', label: 'All time' },
  { key: 'month', label: 'This month' },
  { key: 'week', label: 'This week' },
  { key: 'day', label: 'Today' },
] as const

type WindowKey = (typeof WINDOWS)[number]['key']

const EMPTY_COPY: Record<WindowKey, string> = {
  all: 'Nobody has opted in to the leaderboard yet.',
  month: 'No credits earned in the last 30 days.',
  week: 'No credits earned in the last 7 days.',
  day: 'No credits earned today.',
}

type LeaderboardRow = { rank: number; display_name: string; credits: number }

export default async function LeaderboardPage({ searchParams }: PageProps<'/'>) {
  const params = await searchParams
  const requested = typeof params.window === 'string' ? params.window : 'all'
  const active = (WINDOWS.find((w) => w.key === requested)?.key ?? 'all') as WindowKey

  const supabase = await createClient()
  const [{ data, error }, viewer] = await Promise.all([
    supabase.rpc('get_leaderboard', { p_window: active }),
    getViewer(),
  ])

  const rows = (data ?? []) as LeaderboardRow[]

  return (
    <div className="space-y-8">
      {!viewer && (
        <section className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Count your credits</h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted">
            A credit is a rollercoaster you have ridden at least once. Log every ride, watch the
            number grow, and keep it private unless you choose otherwise.
          </p>
          <div className="mt-5 flex items-center justify-center gap-2">
            <Link href="/signup" className="btn btn-primary">
              Create an account
            </Link>
            <Link href="/login" className="btn btn-secondary">
              Sign in
            </Link>
          </div>
        </section>
      )}

      <section className="card overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold">Leaderboard</h2>
            <p className="mt-0.5 text-xs text-muted">
              Opted-in riders only, ranked by credits. Never shows which coasters anyone rode.
            </p>
          </div>

          <nav className="flex flex-wrap gap-1" aria-label="Leaderboard period">
            {WINDOWS.map((w) => (
              <Link
                key={w.key}
                href={w.key === 'all' ? '/' : `/?window=${w.key}`}
                aria-current={w.key === active ? 'page' : undefined}
                className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                  w.key === active ? 'bg-accent-soft text-accent' : 'text-muted hover:text-foreground'
                }`}
              >
                {w.label}
              </Link>
            ))}
          </nav>
        </header>

        <div className="p-5">
          {error ? (
            <Banner tone="error">The leaderboard could not be loaded. Please try again.</Banner>
          ) : rows.length === 0 ? (
            <EmptyState title={EMPTY_COPY[active]}>
              Riders choose whether to appear here. Privacy is the default.
            </EmptyState>
          ) : (
            <table className="w-full text-sm">
              <caption className="sr-only">
                Riders ranked by credit count, {WINDOWS.find((w) => w.key === active)?.label}
              </caption>
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted">
                  <th scope="col" className="w-12 pb-2 font-medium">
                    #
                  </th>
                  <th scope="col" className="pb-2 font-medium">
                    Rider
                  </th>
                  <th scope="col" className="w-24 pb-2 text-right font-medium">
                    Credits
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={`${row.rank}-${row.display_name}-${index}`} className="border-t border-border">
                    <td className="py-2.5 tabular-nums text-muted">{row.rank}</td>
                    <td className="py-2.5 font-medium">{row.display_name}</td>
                    <td className="py-2.5 text-right tabular-nums font-semibold">{row.credits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {active !== 'all' && (
        <p className="text-center text-xs text-muted">
          A credit counts on the day it was first earned, so re-riding a coaster you already had
          adds to your ride count but not to this period&rsquo;s credits.
        </p>
      )}
    </div>
  )
}
