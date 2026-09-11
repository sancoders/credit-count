import Link from 'next/link'
import { signOut } from '@/lib/actions/auth'
import { getViewer } from '@/lib/auth'

export async function SiteHeader() {
  const viewer = await getViewer()

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          Credit<span className="text-accent">Count</span>
        </Link>

        <nav className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
          <Link href="/" className="hover:text-foreground">
            Leaderboard
          </Link>
          {viewer && (
            <>
              <Link href="/dashboard" className="hover:text-foreground">
                Dashboard
              </Link>
              <Link href="/rides" className="hover:text-foreground">
                My rides
              </Link>
              <Link href="/settings" className="hover:text-foreground">
                Settings
              </Link>
              {viewer.profile.is_admin && (
                <Link href="/admin" className="hover:text-foreground">
                  Catalogue
                </Link>
              )}
            </>
          )}
        </nav>

        {viewer ? (
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted sm:inline">
              {viewer.profile.display_name}
              {viewer.profile.is_admin && (
                <span className="ml-1.5 rounded bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent">
                  Admin
                </span>
              )}
            </span>
            <form action={signOut}>
              <button type="submit" className="btn btn-ghost text-xs">
                Sign out
              </button>
            </form>
          </div>
        ) : (
          <div className="flex items-center gap-2">
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
