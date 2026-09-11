import Link from 'next/link'
import { SignInForm } from '@/components/AuthForms'

export const metadata = { title: 'Sign in · Credit Count' }

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md py-3 sm:py-8">
      <header className="page-intro relative overflow-hidden rounded-2xl border border-border bg-surface px-5 py-6 sm:px-7 sm:py-8">
        <span
          aria-hidden="true"
          className="absolute right-5 top-0 h-20 w-20 -translate-y-8 rounded-full border border-accent/20 sm:right-8"
        />
        <div className="relative">
          <p className="section-kicker">Rider access pass</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-2 max-w-sm text-sm leading-6 text-muted">
            Welcome back. Pick up where you left off.
          </p>
        </div>
      </header>

      <div className="card ticket-panel relative z-10 mx-2 -mt-2 p-5 sm:mx-4 sm:p-6">
        <SignInForm />
      </div>

      <p className="mt-5 text-center text-xs text-muted">
        No account yet?{' '}
        <Link href="/signup" className="font-medium text-accent">
          Create one
        </Link>
      </p>
    </div>
  )
}
