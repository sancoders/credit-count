'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import {
  displayNameField,
  emailField,
  field,
  firstIssue,
  passwordField,
  type ActionState,
} from './shared'

const signUpSchema = z.object({
  email: emailField,
  password: passwordField,
  displayName: displayNameField,
})

export async function signUp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signUpSchema.safeParse({
    email: field(formData, 'email'),
    password: field(formData, 'password'),
    displayName: field(formData, 'displayName'),
  })
  if (!parsed.success) return { error: firstIssue(parsed.error) }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    // Read by the handle_new_user() trigger, which creates the profile row.
    options: { data: { display_name: parsed.data.displayName } },
  })

  if (error) return { error: error.message }

  // Email confirmation is disabled in this deployment (declared in the TDD), so
  // sign-up returns a session. If it were enabled there would be no session and
  // the honest answer is to say so rather than bounce the user to an empty app.
  if (!data.session) {
    return { error: 'Account created. Check your email to confirm it, then sign in.' }
  }

  redirect('/dashboard')
}

const signInSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Enter your password.'),
})

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signInSchema.safeParse({
    email: field(formData, 'email'),
    password: field(formData, 'password'),
  })
  if (!parsed.success) return { error: firstIssue(parsed.error) }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)

  // Deliberately one message for both failures. Saying "no such account" would
  // turn the sign-in form into a way to test whether an email is registered.
  if (error) return { error: 'Email or password is incorrect.' }

  redirect('/dashboard')
}

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}
