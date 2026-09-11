import Link from 'next/link'
import { Banner, EmptyState, PrivacyNote } from '@/components/ui'
import { getViewer } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

/*
  The public leaderboard. This is the one page a signed-out visitor can see,
  along with sign-up and sign-in (FR1).

  It reads through get_leaderboard(), a SECURITY DEFINER function granted to
  the anon role that returns rank, display name and credit count and nothing
  else. It is structurally incapable of revealing which coasters anyone has
  ridden, because those columns are not in its return type (FR7).

  What the time windows DO disclose, and the copy on this page says so rather
  than glossing it: filtering by period tells a visitor that an opted-in rider
  earned a credit within that period, to day granularity. It never says which
  coaster, or on which visit. That is the one piece of timing information the
  windowed board trades for being useful, and it is declared in the TDD.

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

  // How many riders share each rank. SQL rank() ties, so a shared rank is not a
  // podium place and must not get a medal.
  const rankCounts = new Map<number, number>()
  for (const row of rows) rankCounts.set(row.rank, (rankCounts.get(row.rank) ?? 0) + 1)

  return (
    <div className="space-y-7 sm:space-y-10">
      <section className="hero-panel px-6 py-8 sm:px-10 sm:py-12">
        <div className="hero-track" aria-hidden="true" />
        <div className="hero-panel__content max-w-2xl">
          <p className="section-kicker">{viewer ? 'Community board' : 'Your ride field guide'}</p>
          <h1 className="mt-4 max-w-xl text-4xl font-bold tracking-[-0.055em] sm:text-5xl">
            {viewer ? 'Every credit tells a ride story.' : 'Count every ride. Keep every credit.'}
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
            A credit is a rollercoaster you have ridden at least once. Log repeat rides too, then
            watch the detail behind your count take shape.
          </p>

          <div className="hero-definition mt-6">
            <div className="hero-definition__item">
              <p className="hero-definition__eyebrow">1 unique coaster</p>
              <p className="hero-definition__copy">adds one credit to your total.</p>
            </div>
            <div className="hero-definition__item">
              <p className="hero-definition__eyebrow">Every repeat ride</p>
              <p className="hero-definition__copy">adds to rides, not credits.</p>
            </div>
          </div>

          <div className="mt-7 flex flex-wrap gap-2.5">
            {viewer ? (
              <Link href="/dashboard" className="btn btn-primary">
                Open my dashboard <span aria-hidden="true">→</span>
              </Link>
            ) : (
              <>
                <Link href="/signup" className="btn btn-primary">
                  Start your count <span aria-hidden="true">→</span>
                </Link>
                <Link href="/login" className="btn btn-secondary">
                  Sign in
                </Link>
              </>
            )}
          </div>

          <div className="mt-6 max-w-xl">
            <PrivacyNote dark>
              Your ride history stays private. The public board only ever shows an opted-in name
              and credit count.
            </PrivacyNote>
          </div>
        </div>
      </section>

      <section className="leaderboard-panel">
        <header className="leaderboard-panel__head flex flex-wrap items-start justify-between gap-4 px-5 py-5 sm:px-7">
          <div>
            <p className="section-kicker">Public board</p>
            <h2 className="mt-2 text-xl font-bold tracking-tight">Leaderboard</h2>
            <p className="mt-1 max-w-lg text-xs leading-5 text-muted">
              Opted-in riders only, ranked by credits. It never shows which coasters anyone rode.
            </p>
          </div>

          <nav className="segmented-control" aria-label="Leaderboard period">
            {WINDOWS.map((w) => (
              <Link
                key={w.key}
                href={w.key === 'all' ? '/' : `/?window=${w.key}`}
                aria-current={w.key === active ? 'page' : undefined}
                className="segmented-control__item"
              >
                {w.label}
              </Link>
            ))}
          </nav>
        </header>

        <div className="p-5 sm:p-7">
          {error ? (
            <Banner tone="error">The leaderboard could not be loaded. Please try again.</Banner>
          ) : rows.length === 0 ? (
            <EmptyState title={EMPTY_COPY[active]}>
              Riders choose whether to appear here. Privacy is the default.
            </EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[22rem] text-sm">
                <caption className="sr-only">
                  Riders ranked by credit count, {WINDOWS.find((w) => w.key === active)?.label}
                </caption>
                <thead>
                  <tr className="border-b border-border text-left text-[0.68rem] font-bold uppercase tracking-[0.1em] text-muted">
                    <th scope="col" className="w-16 pb-3 font-inherit">
                      Rank
                    </th>
                    <th scope="col" className="pb-3 font-inherit">
                      Rider
                    </th>
                    <th scope="col" className="w-28 pb-3 text-right font-inherit">
                      Credits
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => {
                    // Medal a podium place only when it is actually a podium
                    // place: rank() ties, and riders with no credits in the
                    // window are still listed at zero. Without both guards the
                    // Today tab hands out bronze to everyone on nought.
                    const isPodium =
                      row.credits > 0 && row.rank <= 3 && rankCounts.get(row.rank) === 1
                    const medalClass = isPodium ? ` rank-badge--${row.rank}` : ''
                    return (
                      <tr key={`${row.rank}-${row.display_name}-${index}`} className="border-b border-border/80 last:border-b-0">
                        <td className="py-3.5">
                          <span className={`rank-badge${medalClass}`}>{row.rank}</span>
                        </td>
                        <td className="py-3.5 font-semibold">{row.display_name}</td>
                        <td className="py-3.5 text-right tabular-nums">
                          <span className="credit-count">{row.credits}</span>
                          <span className="ml-1 text-xs text-muted">{row.credits === 1 ? 'credit' : 'credits'}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-5">
            <PrivacyNote>
              A deliberately limited view: display name and credit count, nothing else. Which
              coasters you rode, when you rode them and your notes are not part of what this page
              returns. Filtering by period does show that a credit was earned in that period.
            </PrivacyNote>
          </div>
        </div>
      </section>

      {active !== 'all' && (
        <p className="mx-auto max-w-2xl text-center text-xs leading-5 text-muted">
          A credit counts on the day it was first earned, so re-riding a coaster you already had
          adds to your ride count but not to this period&rsquo;s credits.
        </p>
      )}
    </div>
  )
}
