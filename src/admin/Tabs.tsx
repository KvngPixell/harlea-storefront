import { useState, type FormEvent } from 'react'
import { EyeIcon, EyeOffIcon, PlusIcon, TrashIcon } from '../components/Icons'
import { toast } from '../components/ui'
import { cx, slugify } from '../lib/format'
import { store } from '../lib/store'
import type { Tab, TabKind } from '../types'
import { useAdminCtx } from './AdminApp'
import { ConfirmDialog, Field, Hint, PageHeader, Panel, reportError, SortableList } from './components'

function TabForm({ initial, onDone }: { initial?: Tab; onDone: () => void }) {
  const { catalog, reload } = useAdminCtx()
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [kind, setKind] = useState<TabKind>(initial?.kind ?? 'products')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const slug = initial?.slug ?? slugify(name)
    if (!name.trim() || !slug) return setError('Give the tab a name')
    if (catalog.tabs.some((t) => t.slug === slug && t.id !== initial?.id)) return setError('There’s already a tab with that name')
    setBusy(true)
    try {
      await store.saveTab({
        id: initial?.id, name: name.trim(), slug, description: description.trim(), kind,
        sort_order: initial?.sort_order ?? catalog.tabs.length + 1, is_published: initial?.is_published ?? true,
      })
      await reload()
      toast(initial ? 'Tab updated ✓' : 'Tab added ✨')
      onDone()
    } catch (err) {
      reportError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-3xl bg-blush p-4">
      <Field label="Tab name" error={error}>
        <input className="field" value={name} onChange={(e) => { setName(e.target.value); setError(null) }} placeholder="e.g. Summer Faves" maxLength={40} autoFocus />
      </Field>
      <Field label="Short description (optional)">
        <input className="field" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={160} />
      </Field>
      {!initial && (
        <fieldset>
          <legend className="label">This tab shows…</legend>
          <div className="flex flex-wrap gap-2">
            {(['products', 'outfits'] as const).map((k) => (
              <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={cx('btn btn-sm', kind === k ? 'bg-ink text-white' : 'btn-soft')}>
                {k === 'products' ? 'Products' : 'Outfits / looks'}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      <div className="flex gap-2">
        <button className="btn btn-primary btn-sm" disabled={busy}>{busy ? 'Saving…' : 'Save tab'}</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onDone}>Cancel</button>
      </div>
    </form>
  )
}

export default function Tabs() {
  const { catalog, reload } = useAdminCtx()
  const [editing, setEditing] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<Tab | null>(null)

  const count = (t: Tab) =>
    t.kind === 'outfits' ? catalog.outfits.filter((o) => o.tab_id === t.id).length : catalog.products.filter((p) => p.tab_id === t.id).length

  const run = async (fn: () => Promise<void>, msg: string) => {
    try {
      await fn()
      await reload()
      toast(msg)
    } catch (e) {
      reportError(e)
    }
  }

  return (
    <>
      <PageHeader
        title="Shop tabs"
        subtitle="The sections shoppers see in the menu. Drag to reorder, tap the eye to hide."
        actions={<button className="btn btn-primary" onClick={() => setEditing('new')}><PlusIcon size={20} /> Add a tab</button>}
      />
      {editing === 'new' && <div className="mb-4"><TabForm onDone={() => setEditing(null)} /></div>}
      <Panel>
        <SortableList
          label="Shop tabs"
          items={catalog.tabs}
          onReorder={(ids) => run(() => store.reorder('tabs', ids), 'Menu order saved ✓')}
          render={(t, handle) =>
            editing === t.id ? (
              <TabForm initial={t} onDone={() => setEditing(null)} />
            ) : (
              <div className={cx('flex items-center gap-2 rounded-3xl bg-white p-2 ring-2 ring-petal', !t.is_published && 'opacity-70')}>
                {handle}
                <button className="min-w-0 flex-1 text-left" onClick={() => setEditing(t.id)}>
                  <span className="block truncate font-display text-lg font-semibold">{t.name}</span>
                  <span className="text-sm text-muted">
                    {count(t)} {t.kind === 'outfits' ? 'outfits' : 'products'}{!t.is_published && ' · hidden'} · tap to rename
                  </span>
                </button>
                <button className="btn btn-ghost btn-sm !px-2.5" aria-label={t.is_published ? `Hide ${t.name}` : `Show ${t.name}`}
                  onClick={() => run(() => store.saveTab({ ...t, is_published: !t.is_published }).then(() => undefined), t.is_published ? 'Tab hidden' : 'Tab is live ✨')}>
                  {t.is_published ? <EyeIcon /> : <EyeOffIcon />}
                </button>
                <button className="btn btn-ghost btn-sm !px-2.5" aria-label={`Delete ${t.name}`} onClick={() => setDeleting(t)}>
                  <TrashIcon />
                </button>
              </div>
            )
          }
        />
        <p className="mt-4 text-sm text-muted">
          “Build a Look” always appears in the menu too.
          <Hint>Products tabs list products. Outfit tabs list the looks you make on the Outfits page.</Hint>
        </p>
      </Panel>
      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Delete the “${deleting?.name}” tab?`}
        body="Products and outfits in it are NOT deleted. They just won’t be in a tab until you move them."
        onConfirm={() => { const t = deleting!; setDeleting(null); void run(() => store.deleteTab(t.id), 'Tab deleted') }}
        onCancel={() => setDeleting(null)}
      />
    </>
  )
}
