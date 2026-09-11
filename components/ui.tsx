import type { ReactNode } from 'react'

/** A small, decorative track mark used in the shell and selected ride state. */
export function TrackMark({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M3 16.75C5.7 16.75 5.8 7.25 10.2 7.25c4.05 0 3.18 9.5 7.6 9.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M3 20.25h18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" opacity=".72" />
      <path d="M6.05 16.9v3.2M17.72 16.9v3.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" opacity=".72" />
    </svg>
  )
}

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
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-bold tracking-tight">{title}</h2>}
            {description && <p className="mt-1 max-w-2xl text-xs leading-5 text-muted">{description}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className="p-5 sm:p-6">{children}</div>
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
    error: 'border-danger/20 bg-danger-soft text-danger',
    success: 'border-success/20 bg-success-soft text-success',
    info: 'border-accent/15 bg-accent-soft text-accent-deep',
  } as const

  const symbols = {
    error: '!',
    success: '✓',
    info: 'i',
  } as const

  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm leading-5 ${tones[tone]}`}
    >
      <span
        aria-hidden="true"
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-current/10 text-xs font-bold"
      >
        {symbols[tone]}
      </span>
      <span>{children}</span>
    </p>
  )
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty-state">
      <span className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent">
        <TrackMark className="h-5 w-5" />
      </span>
      <p className="text-sm font-bold tracking-tight">{title}</p>
      {children && <p className="mx-auto mt-1.5 max-w-md text-xs leading-5 text-muted">{children}</p>}
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
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.label} className="stat-bar text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate font-medium">{row.label}</span>
            <span className="tabular-nums text-xs font-semibold text-muted">{row.credits}</span>
          </div>
          <div className="stat-bar__track mt-1.5">
            <div
              className="stat-bar__value"
              style={{ width: `${(row.credits / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

export function MetricCard({
  label,
  value,
  detail,
  featured = false,
}: {
  label: string
  value: ReactNode
  detail: ReactNode
  featured?: boolean
}) {
  return (
    <section className={`metric-card ${featured ? 'metric-card--featured' : ''}`}>
      <p className="metric-card__label">{label}</p>
      <div className="metric-card__value">{value}</div>
      <p className="metric-card__detail">{detail}</p>
    </section>
  )
}

export function PrivacyNote({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <p className={`privacy-note ${dark ? 'privacy-note--dark' : ''}`}>
      <span className="privacy-note__icon" aria-hidden="true">
        <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" focusable="false">
          <rect x="3.25" y="6.75" width="9.5" height="6.5" rx="1.3" stroke="currentColor" strokeWidth="1.35" />
          <path d="M5.25 6.75V5.2a2.75 2.75 0 0 1 5.5 0v1.55" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
        </svg>
      </span>
      <span>{children}</span>
    </p>
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
