'use client'

import { useActionState } from 'react'
import { createCoaster } from '@/lib/actions/catalogue'
import { Banner } from './ui'
import { SubmitButton } from './SubmitButton'

const TYPES = ['Steel', 'Wooden', 'Hybrid'] as const

export function AddCoasterForm() {
  const [state, action] = useActionState(createCoaster, {})

  return (
    <form action={action} className="space-y-3">
      {state.error && <Banner tone="error">{state.error}</Banner>}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field name="name" label="Name" placeholder="Nemesis" />
        <Field name="park" label="Park" placeholder="Alton Towers" />
        <Field name="country" label="Country" placeholder="United Kingdom" maxLength={80} />
        <Field
          name="manufacturer"
          label="Manufacturer"
          placeholder="Bolliger &amp; Mabillard"
          maxLength={80}
        />

        <div>
          <label htmlFor="type" className="mb-1 block text-xs font-medium">
            Type
          </label>
          <select id="type" name="type" className="field" defaultValue="Steel" required>
            {TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      <SubmitButton pendingLabel="Adding…">Add to catalogue</SubmitButton>
    </form>
  )
}

function Field({
  name,
  label,
  placeholder,
  maxLength = 120,
}: {
  name: string
  label: string
  placeholder: string
  maxLength?: number
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-xs font-medium">
        {label}
      </label>
      <input
        id={name}
        name={name}
        className="field"
        placeholder={placeholder}
        maxLength={maxLength}
        required
      />
    </div>
  )
}
