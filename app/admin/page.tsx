import Link from 'next/link'
import { AddCoasterForm } from '@/components/AddCoasterForm'
import { Banner, Card } from '@/components/ui'
import { removeCoaster, restoreCoaster, updateCoaster } from '@/lib/actions/catalogue'
import { requireAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Catalogue · Credit Count' }

/*
  Admin catalogue management.

  requireAdmin() only decides what this page renders. The coasters_admin_write
  policy is what makes it true: an enthusiast posting straight to these Server
  Actions is rejected by Postgres, with no help from this file. That is the
  distinction the SOW draws when it says catalogue restrictions "must hold at
  the database layer, not only in the interface".

  Note also what an admin cannot do: read anybody's rides. No policy on the
  rides table grants them anything.
*/

const TYPES = ['Steel', 'Wooden', 'Hybrid'] as const

const NOTICES: Record<string, string> = {
  'added=1': 'Coaster added to the catalogue.',
  'updated=1': 'Coaster updated.',
  'removed=deleted': 'Coaster deleted. Nobody had logged a ride on it.',
  'removed=deactivated':
    'Coaster deactivated. It has logged rides, so it left the catalogue but every rider keeps their history and their credit.',
  'restored=1': 'Coaster restored to the catalogue.',
}

export default async function AdminPage({ searchParams }: PageProps<'/admin'>) {
  const params = await searchParams
  const error = typeof params.error === 'string' ? params.error : ''
  const editingId = typeof params.edit === 'string' ? params.edit : ''

  const notice = Object.entries(params)
    .map(([key, value]) => NOTICES[`${key}=${String(value)}`])
    .find(Boolean)

  await requireAdmin()
  const supabase = await createClient()

  const { data } = await supabase
    .from('coasters')
    .select('id, name, park, country, manufacturer, type, is_active')
    .order('is_active', { ascending: false })
    .order('name', { ascending: true })

  const coasters = data ?? []
  const active = coasters.filter((c) => c.is_active).length

  return (
    <div className="space-y-6">
      <header className="page-intro flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-border bg-surface px-5 py-5 sm:px-7 sm:py-6">
        <div>
          <p className="section-kicker">Catalogue control</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Coaster catalogue</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Shared by every rider, which is what makes credit counts comparable. {active} active
            {coasters.length !== active && `, ${coasters.length - active} deactivated`}.
          </p>
        </div>
        <span className="status-pill rounded-full border border-border px-3 py-1 text-xs font-medium tabular-nums text-muted">
          {active} active
        </span>
      </header>

      {error && <Banner tone="error">{error}</Banner>}
      {notice && <Banner tone="success">{notice}</Banner>}

      <Card
        className="overflow-hidden"
        title="Add a coaster"
        description="Name and park together must be unique, which is the guard against duplicate entries."
      >
        <AddCoasterForm />
      </Card>

      <Card className="ride-ledger overflow-hidden" title="Catalogue">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-sm">
            <caption className="sr-only">Shared coaster catalogue</caption>
            <thead className="bg-accent-soft/50">
              <tr className="text-left text-xs uppercase tracking-[0.14em] text-muted">
                <th scope="col" className="px-3 py-3 font-medium sm:px-4">Coaster</th>
                <th scope="col" className="px-3 py-3 font-medium sm:px-4">Park</th>
                <th scope="col" className="px-3 py-3 font-medium sm:px-4">Country</th>
                <th scope="col" className="px-3 py-3 font-medium sm:px-4">Manufacturer</th>
                <th scope="col" className="px-3 py-3 font-medium sm:px-4">Type</th>
                <th scope="col" className="px-3 py-3 text-right font-medium sm:px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {coasters.map((coaster) => {
                const isEditing = coaster.id === editingId
                if (isEditing) {
                  return (
                    <tr key={coaster.id} className="border-t border-border bg-accent-soft/70">
                      <td colSpan={6} className="px-3 py-4 sm:px-4">
                        <form action={updateCoaster} className="flex flex-wrap items-end gap-2">
                          <input type="hidden" name="coasterId" value={coaster.id} />
                          <EditField name="name" label="Coaster" value={coaster.name} />
                          <EditField name="park" label="Park" value={coaster.park} />
                          <EditField name="country" label="Country" value={coaster.country} />
                          <EditField
                            name="manufacturer"
                            label="Manufacturer"
                            value={coaster.manufacturer}
                          />
                          <div>
                            <label
                              htmlFor={`type-${coaster.id}`}
                              className="mb-1 block text-xs font-medium"
                            >
                              Type
                            </label>
                            <select
                              id={`type-${coaster.id}`}
                              name="type"
                              className="field"
                              defaultValue={coaster.type}
                            >
                              {TYPES.map((type) => (
                                <option key={type} value={type}>
                                  {type}
                                </option>
                              ))}
                            </select>
                          </div>
                          <button type="submit" className="btn btn-primary">
                            Save
                          </button>
                          <Link href="/admin" scroll={false} className="btn btn-ghost">
                            Cancel
                          </Link>
                        </form>
                      </td>
                    </tr>
                  )
                }

                return (
                  <tr
                    key={coaster.id}
                    className={`border-t border-border transition-colors hover:bg-accent-soft/30 ${coaster.is_active ? '' : 'text-muted'}`}
                  >
                    <td className="px-3 py-3 font-medium sm:px-4">
                      {coaster.name}
                      {!coaster.is_active && (
                        <span className="status-pill ml-2 rounded-full bg-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                          Deactivated
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 sm:px-4">{coaster.park}</td>
                    <td className="px-3 py-3 sm:px-4">{coaster.country}</td>
                    <td className="px-3 py-3 sm:px-4">{coaster.manufacturer}</td>
                    <td className="px-3 py-3 sm:px-4">{coaster.type}</td>
                    <td className="px-3 py-3 sm:px-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/admin?edit=${coaster.id}`}
                          scroll={false}
                          className="btn btn-secondary text-xs"
                        >
                          Edit
                        </Link>
                        {coaster.is_active ? (
                          <form action={removeCoaster}>
                            <input type="hidden" name="coasterId" value={coaster.id} />
                            <button type="submit" className="btn btn-ghost text-xs text-danger">
                              Remove
                            </button>
                          </form>
                        ) : (
                          <form action={restoreCoaster}>
                            <input type="hidden" name="coasterId" value={coaster.id} />
                            <button type="submit" className="btn btn-ghost text-xs">
                              Restore
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-5 border-t border-border pt-4 text-xs leading-5 text-muted">
          <strong>Remove</strong> deletes a coaster nobody has ridden. If rides exist it is
          deactivated instead: it disappears from search and from the catalogue, and every rider
          keeps the ride and the credit. v1 does not merge duplicates, so a rider who logged both
          copies of a duplicated coaster still holds two credits.
        </p>
      </Card>
    </div>
  )
}

function EditField({ name, label, value }: { name: string; label: string; value: string }) {
  return (
    <div className="w-40">
      <label htmlFor={`${name}-edit`} className="mb-1 block text-xs font-medium">
        {label}
      </label>
      <input id={`${name}-edit`} name={name} className="field" defaultValue={value} required />
    </div>
  )
}
