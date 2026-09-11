import Link from 'next/link'
import { Banner, Card } from '@/components/ui'
import { setLeaderboardVisibility, updateDisplayName } from '@/lib/actions/profile'
import { requireViewer } from '@/lib/auth'

export const metadata = { title: 'Settings · Credit Count' }

const SAVED_COPY: Record<string, string> = {
  name: 'Display name saved.',
  shown: 'You are now on the public leaderboard.',
  hidden: 'You have been removed from the public leaderboard.',
}

export default async function SettingsPage({ searchParams }: PageProps<'/settings'>) {
  const params = await searchParams
  const error = typeof params.error === 'string' ? params.error : ''
  const saved = typeof params.saved === 'string' ? SAVED_COPY[params.saved] : ''

  const { profile } = await requireViewer()
  const visible = profile.show_on_leaderboard

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-0.5 text-sm text-muted">Your name and who can see you.</p>
      </div>

      {error && <Banner tone="error">{error}</Banner>}
      {saved && <Banner tone="success">{saved}</Banner>}

      <Card
        title="Display name"
        description="Shown on the leaderboard when you opt in. Names do not have to be unique."
      >
        <form action={updateDisplayName} className="flex flex-wrap items-end gap-3">
          <div className="min-w-52 flex-1">
            <label htmlFor="displayName" className="sr-only">
              Display name
            </label>
            <input
              id="displayName"
              name="displayName"
              className="field"
              defaultValue={profile.display_name}
              required
              minLength={2}
              maxLength={40}
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Save
          </button>
        </form>
      </Card>

      {/*
        FR7: opting out removes you from the leaderboard immediately.
        get_leaderboard filters on this flag at read time and every page that
        renders it is dynamic, so there is no cached copy that could keep
        somebody visible after they left.
      */}
      <Card
        title="Public leaderboard"
        description="Off by default. Privacy is the default, and this is the only setting that changes it."
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">
            {visible ? (
              <>
                You appear on the{' '}
                <Link href="/" className="font-medium text-accent">
                  public leaderboard
                </Link>{' '}
                as <strong>{profile.display_name}</strong>, with your credit count.
              </>
            ) : (
              <>You are not listed. Nobody can see your credits or your rides.</>
            )}
          </p>

          <form action={setLeaderboardVisibility}>
            <input type="hidden" name="show" value={visible ? 'false' : 'true'} />
            <button type="submit" className={visible ? 'btn btn-secondary' : 'btn btn-primary'}>
              {visible ? 'Remove me' : 'Show me on the leaderboard'}
            </button>
          </form>
        </div>

        <p className="mt-4 border-t border-border pt-4 text-xs text-muted">
          The leaderboard only ever shows a display name and a credit count. It cannot show which
          coasters you have ridden, your notes or your dates: those columns are not part of what it
          returns.
        </p>
      </Card>

      <Card title="Role" description="Admin access is granted manually. There is no self-serve sign-up for it.">
        <p className="text-sm">
          {profile.is_admin ? (
            <>
              You are an <strong>admin</strong>: you can manage the shared coaster catalogue. You
              cannot see any other rider&rsquo;s ride history, and neither can anyone else.
            </>
          ) : (
            <>
              You are an <strong>enthusiast</strong>. You log rides and manage your own history.
            </>
          )}
        </p>
      </Card>
    </div>
  )
}
