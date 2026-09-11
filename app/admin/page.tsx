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
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Coaster catalogue</h1>
        <p className="mt-0.5 text-sm text-muted">
          Shared by every rider, which is what makes credit counts comparable. {active} active
          {coasters.length !== active && `, ${coasters.length - active} deactivated`}.
        </p>
      </div>

      {error && <Banner tone="error">{error}</Banner>}
      {notice && <Banner tone="success">{notice}</Banner>}

      <Card
        title="Add a coaster"
        description="Name and park together must be unique, which is the guard against duplicate entries."
      >
        <AddCoasterForm />
      </Card>

      <Card title="Catalogue">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted">
                <th scope="col" className="pb-2 font-medium">Coaster</th>
                <th scope="col" className="pb-2 font-medium">Park</th>
                <th scope="col" className="pb-2 font-medium">Country</th>
                <th scope="col" className="pb-2 font-medium">Manufacturer</th>
                <th scope="col" className="pb-2 font-medium">Type</th>
                <th scope="col" className="pb-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {coasters.map((coaster) => {
                const isEditing = coaster.id === editingId
                if (isEditing) {
                  return (
                    <tr key={coaster.id} className="border-t border-border bg-accent-soft/50">
                      <td colSpan={6} className="py-3">
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
                    className={`border-t border-border ${coaster.is_active ? '' : 'text-muted'}`}
                  >
                    <td className="py-2.5 font-medium">
                      {coaster.name}
                      {!coaster.is_active && (
                        <span className="ml-2 rounded bg-border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                          Deactivated
                        </span>
                      )}
                    </td>
                    <td className="py-2.5">{coaster.park}</td>
                    <td className="py-2.5">{coaster.country}</td>
                    <td className="py-2.5">{coaster.manufacturer}</td>
                    <td className="py-2.5">{coaster.type}</td>
                    <td className="py-2.5">
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

        <p className="mt-4 border-t border-border pt-4 text-xs text-muted">
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
