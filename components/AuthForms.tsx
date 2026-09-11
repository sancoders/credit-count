'use client'

import { useActionState } from 'react'
import { signIn, signUp } from '@/lib/actions/auth'
import { Banner } from './ui'
import { SubmitButton } from './SubmitButton'

/*
  The two forms that use useActionState rather than a plain server-rendered
  form. The difference matters here: a failed sign-up should not throw away the
  display name and email somebody just typed.
*/

export function SignUpForm() {
  const [state, action] = useActionState(signUp, {})

  return (
    <form action={action} className="space-y-4">
      {state.error && <Banner tone="error">{state.error}</Banner>}

      <div>
        <label htmlFor="displayName" className="mb-1 block text-xs font-medium">
          Display name
        </label>
        <input
          id="displayName"
          name="displayName"
          className="field"
          required
          minLength={2}
          maxLength={40}
          autoComplete="nickname"
          placeholder="How you appear on the leaderboard"
        />
        <p className="mt-1 text-xs text-muted">
          This is the only thing the leaderboard ever shows about you, and only if you opt in.
        </p>
      </div>

      <div>
        <label htmlFor="email" className="mb-1 block text-xs font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          className="field"
          required
          autoComplete="email"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1 block text-xs font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="field"
          required
          minLength={8}
          autoComplete="new-password"
        />
        <p className="mt-1 text-xs text-muted">At least 8 characters.</p>
      </div>

      <SubmitButton pendingLabel="Creating account…" className="btn btn-primary w-full">
        Create account
      </SubmitButton>
    </form>
  )
}

export function SignInForm() {
  const [state, action] = useActionState(signIn, {})

  return (
    <form action={action} className="space-y-4">
      {state.error && <Banner tone="error">{state.error}</Banner>}

      <div>
        <label htmlFor="email" className="mb-1 block text-xs font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          className="field"
          required
          autoComplete="email"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1 block text-xs font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="field"
          required
          autoComplete="current-password"
        />
      </div>

      <SubmitButton pendingLabel="Signing in…" className="btn btn-primary w-full">
        Sign in
      </SubmitButton>
    </form>
  )
}
