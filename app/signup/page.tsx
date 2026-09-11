import Link from 'next/link'
import { SignUpForm } from '@/components/AuthForms'
import { PrivacyNote } from '@/components/ui'

export const metadata = { title: 'Create account · Credit Count' }

export default function SignUpPage() {
  return (
    <div className="mx-auto max-w-md py-3 sm:py-8">
      <header className="page-intro relative overflow-hidden rounded-2xl border border-border bg-surface px-5 py-6 sm:px-7 sm:py-8">
        <span
          aria-hidden="true"
          className="absolute right-5 top-0 h-20 w-20 -translate-y-8 rounded-full border border-accent/20 sm:right-8"
        />
        <div className="relative">
          <p className="section-kicker">New rider pass</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Create your account</h1>
          <div className="mt-3 max-w-md">
            <PrivacyNote>
              Your ride history is private by default and stays that way unless you opt in to the
              leaderboard.
            </PrivacyNote>
          </div>
        </div>
      </header>

      <div className="card ticket-panel relative z-10 mx-2 -mt-2 p-5 sm:mx-4 sm:p-6">
        <SignUpForm />
      </div>

      <p className="mt-5 text-center text-xs text-muted">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-accent">
          Sign in
        </Link>
      </p>
    </div>
  )
}
