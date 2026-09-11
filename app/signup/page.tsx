import Link from 'next/link'
import { SignUpForm } from '@/components/AuthForms'

export const metadata = { title: 'Create account · Credit Count' }

export default function SignUpPage() {
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-xl font-semibold tracking-tight">Create your account</h1>
      <p className="mt-1 mb-6 text-sm text-muted">
        Your ride history is private by default and stays that way unless you opt in to the
        leaderboard.
      </p>

      <div className="card p-5">
        <SignUpForm />
      </div>

      <p className="mt-4 text-center text-xs text-muted">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-accent">
          Sign in
        </Link>
      </p>
    </div>
  )
}
