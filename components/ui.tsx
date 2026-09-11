import type { ReactNode } from 'react'

export function Card({
  title,
  description,
  action,
  children,
  className = '',
}: {
  title?: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            {title && <h2 className="text-sm font-semibold">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
          </div>
          {action}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  )
}

export function Banner({
  tone,
  children,
}: {
  tone: 'error' | 'success' | 'info'
  children: ReactNode
}) {
  const tones = {
    error: 'bg-danger-soft text-danger',
    success: 'bg-success-soft text-success',
    info: 'bg-accent-soft text-accent',
  } as const

  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-lg px-3 py-2 text-sm ${tones[tone]}`}
    >
      {children}
    </p>
  )
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border px-5 py-8 text-center">
      <p className="text-sm font-medium">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-md text-xs text-muted">{children}</p>}
    </div>
  )
}

/** A labelled count, used for the country / manufacturer / type breakdowns. */
export function BreakdownList({ rows }: { rows: { label: string; credits: number }[] }) {
  if (rows.length === 0) {
    return <p className="text-xs text-muted">Nothing yet.</p>
  }

  const max = Math.max(...rows.map((r) => r.credits), 1)

  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li key={row.label} className="text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate">{row.label}</span>
            <span className="tabular-nums text-xs text-muted">{row.credits}</span>
          </div>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${(row.credits / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

export function formatDate(iso: string): string {
  // en-GB with an explicit UTC timezone: dates are stored as plain dates, and
  // formatting them in the viewer's zone would shift some of them by a day.
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}
