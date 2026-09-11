import Link from 'next/link'
import { signOut } from '@/lib/actions/auth'
import { getViewer } from '@/lib/auth'
import { TrackMark } from './ui'

export async function SiteHeader() {
  const viewer = await getViewer()

  return (
    <header className="site-header">
      <div className="site-header__inner mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 sm:px-6">
        <Link href="/" className="brand-lockup shrink-0" aria-label="Credit Count home">
          <span className="brand-mark">
            <TrackMark className="h-5 w-5" />
          </span>
          <span className="brand-wordmark">
            Credit<em>Count</em>
          </span>
          <span className="brand-tag">Ride log</span>
        </Link>

        <nav className="site-nav flex flex-1 items-center gap-0.5" aria-label="Primary navigation">
          <Link href="/">Leaderboard</Link>
          {viewer && (
            <>
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/rides">My rides</Link>
              <Link href="/settings">Settings</Link>
              {viewer.profile.is_admin && <Link href="/admin">Catalogue</Link>}
            </>
          )}
        </nav>

        {viewer ? (
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <span className="viewer-chip">
              {viewer.profile.display_name}
              {viewer.profile.is_admin && <span className="viewer-chip__role">Admin</span>}
            </span>
            <form action={signOut}>
              <button type="submit" className="btn btn-ghost text-xs">
                Sign out
              </button>
            </form>
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Link href="/login" className="btn btn-secondary text-xs">
              Sign in
            </Link>
            <Link href="/signup" className="btn btn-primary text-xs">
              Create account
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
