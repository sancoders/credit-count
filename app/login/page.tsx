import Link from 'next/link'
import { SignInForm } from '@/components/AuthForms'

export const metadata = { title: 'Sign in · Credit Count' }

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-1 mb-6 text-sm text-muted">Welcome back. Pick up where you left off.</p>

      <div className="card p-5">
        <SignInForm />
      </div>

      <p className="mt-4 text-center text-xs text-muted">
        No account yet?{' '}
        <Link href="/signup" className="font-medium text-accent">
          Create one
        </Link>
      </p>
    </div>
  )
}
