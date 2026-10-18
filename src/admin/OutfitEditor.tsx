import { useState, type FormEvent } from 'react'
import { ArrowLeftIcon, CloseIcon, TrashIcon } from '../components/Icons'
import { OutfitCollage } from '../components/OutfitCard'
import { ErrorState, ProductImg, toast } from '../components/ui'
import { cx, money, slugify } from '../lib/format'
import { Link, navigate } from '../lib/router'
import { store } from '../lib/store'
import type { Product } from '../types'
import { useAdminCtx } from './AdminApp'
import { ConfirmDialog, Field, Hint, PageHeader, Panel, PhotoManager, reportError, SortableList, Toggle } from './components'
import { TYPE_LABELS } from './Products'

export default function OutfitEditor({ id }: { id: string }) {
  const { catalog, reload } = useAdminCtx()
  const isNew = id === 'new'
  const existing = catalog.outfits.find((o) => o.id === id)
  const outfitTabs = catalog.tabs.filter((t) => t.kind === 'outfits')
  const [name, setName] = useState(existing?.name ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [tabId, setTabId] = useState(existing ? existing.tab_id ?? '' : outfitTabs[0]?.id ?? '')
  const [published, setPublished] = useState(existing?.is_published ?? true)
  const [cover, setCover] = useState(existing?.cover_image_url ? [{ url: existing.cover_image_url, alt: '' }] : [])
  const [pieceIds, setPieceIds] = useState<string[]>(
    (existing?.outfit_items ?? []).slice().sort((a, b) => a.sort_order - b.sort_order).map((i) => i.product_id),
  )
  const [q, setQ] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!isNew && !existing) return <ErrorState message="We couldn’t find that outfit." />

  const byId = new Map(catalog.products.map((p) => [p.id, p]))
  const pieces = pieceIds.map((pid) => byId.get(pid)).filter((p): p is Product => Boolean(p))
  const total = pieces.reduce((s, p) => s + p.price_cents, 0)
  const choices = catalog.products.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()))
  const toggle = (pid: string) => setPieceIds((ids) => (ids.includes(pid) ? ids.filter((x) => x !== pid) : [...ids, pid]))

  const save = async (e: FormEvent) => {
    e.preventDefault()
    const slug = existing?.slug ?? slugify(name)
    if (!name.trim() || !slug) return setError('Give the outfit a name')
    if (catalog.outfits.some((o) => o.slug === slug && o.id !== existing?.id)) return setError('Another outfit already has this name')
    if (pieceIds.length === 0) return toast('Pick at least one piece for this outfit')
    setSaving(true)
    try {
      await store.saveOutfit(
        { id: existing?.id, name: name.trim(), slug, description: description.trim(), tab_id: tabId || null,
          cover_image_url: cover[0]?.url ?? null, is_published: published, sort_order: existing?.sort_order ?? catalog.outfits.length + 1 },
        pieceIds,
      )
      await reload()
      toast(isNew ? 'Outfit created ✨' : 'Saved ✓')
      navigate('/admin/outfits')
    } catch (err) {
      reportError(err)
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    setConfirmDelete(false)
    try {
      await store.deleteOutfit(existing!.id)
      await reload()
      toast('Outfit deleted')
      navigate('/admin/outfits')
    } catch (e) {
      reportError(e)
    }
  }

  const hiddenPieces = pieces.filter((p) => !p.is_published)
  const showHidden = async () => {
    try {
      await Promise.all(hiddenPieces.map((p) => store.updateProduct(p.id, { is_published: true })))
      await reload()
      toast('Pieces are visible now ✨')
    } catch (e) {
      reportError(e)
    }
  }

  return (
    <form onSubmit={save} noValidate>
      <Link to="/admin/outfits" className="btn btn-ghost btn-sm -ml-2 mb-2"><ArrowLeftIcon size={18} /> All outfits</Link>
      <PageHeader title={isNew ? 'New outfit' : 'Edit outfit'} actions={existing && <Link to={`/looks/${existing.slug}`} target="_blank" className="btn btn-soft btn-sm">View in shop ↗</Link>} />
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <Panel title="About this look">
            <div className="space-y-4">
              <Field label="Outfit name" error={error}>
                <input className="field" value={name} onChange={(e) => { setName(e.target.value); setError(null) }} placeholder="e.g. Brunch Date" maxLength={60} />
              </Field>
              <Field label="Description (optional)">
                <textarea className="field min-h-20" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Where would you wear it?" maxLength={600} />
              </Field>
            </div>
          </Panel>
          <Panel title={<>Pick the pieces <Hint>Tap products to add or remove them. Need something from another store? First add it as a product with type “Link to another store”, then pick it here.</Hint></>}>
            <input className="field mb-3" placeholder="Search products…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search products" />
            <ul className="grid max-h-[28rem] grid-cols-3 gap-2 overflow-y-auto p-1 sm:grid-cols-4">
              {choices.map((p) => {
                const on = pieceIds.includes(p.id)
                return (
                  <li key={p.id}>
                    <button type="button" onClick={() => toggle(p.id)} aria-pressed={on}
                      className={cx('relative block w-full rounded-2xl bg-white p-1.5 text-left ring-2 transition', on ? 'ring-rose' : 'ring-petal hover:ring-bubblegum')}>
                      <ProductImg product={p} className="aspect-[4/5] w-full rounded-xl" />
                      <span className="mt-1 block truncate px-0.5 text-xs font-semibold">{p.name}</span>
                      <span className="block px-0.5 text-xs text-muted">{money(p.price_cents)} · {TYPE_LABELS[p.type]}</span>
                      {on && <span className="chip absolute right-2 top-2 bg-rose text-white">#{pieceIds.indexOf(p.id) + 1}</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
          </Panel>
        </div>
        <div className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          <Panel title="Preview">
            <OutfitCollage pieces={pieces} cover={cover[0]?.url} />
            {pieces.length > 0 && (
              <div className="mt-3">
                <p className="mb-2 text-sm text-muted">Drag to set the order pieces are listed in.</p>
                <SortableList label="Pieces in this outfit" items={pieces} onReorder={setPieceIds}
                  render={(p, handle) => (
                    <div className="flex items-center gap-2 rounded-2xl bg-blush p-1.5 pr-2">
                      {handle}
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{p.name}</span>
                      <span className="text-sm">{money(p.price_cents)}</span>
                      <button type="button" aria-label={`Remove ${p.name}`} onClick={() => toggle(p.id)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-white"><CloseIcon size={16} /></button>
                    </div>
                  )}
                />
                <p className="mt-3 flex justify-between font-display text-lg">Total <strong className="text-rose">{money(total)}</strong></p>
              </div>
            )}
            {hiddenPieces.length > 0 && (
              <div className="mt-2 rounded-xl bg-butter/70 px-3 py-2 text-sm">
                {hiddenPieces.length} piece(s) are hidden, so shoppers won’t see them in this outfit.
                <button type="button" className="btn btn-soft btn-sm mt-2 w-full" onClick={showHidden}>Show these pieces too</button>
              </div>
            )}
          </Panel>
          <Panel title="Settings">
            <div className="space-y-3">
              <Field label="Shop tab">
                <select className="field" value={tabId} onChange={(e) => setTabId(e.target.value)}>
                  {outfitTabs.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  <option value="">No tab</option>
                </select>
              </Field>
              <Toggle label="Show on the shop" checked={published} onChange={setPublished} />
              <div>
                <span className="label">Cover photo (optional) <Hint>Upload a photo of the whole outfit. If you skip it, we make a collage from the pieces.</Hint></span>
                <PhotoManager photos={cover} onChange={(p) => setCover(p.slice(-1))} folder="outfits" max={1} />
              </div>
            </div>
          </Panel>
          <button className="btn btn-primary w-full text-lg" disabled={saving}>{saving ? 'Saving…' : isNew ? 'Create outfit' : 'Save changes'}</button>
          {existing && <button type="button" className="btn btn-ghost w-full" onClick={() => setConfirmDelete(true)}><TrashIcon size={18} /> Delete outfit</button>}
        </div>
      </div>
      <ConfirmDialog open={confirmDelete} title={`Delete “${existing?.name ?? ''}”?`} body="The pieces stay in your shop; only the outfit is removed." onConfirm={remove} onCancel={() => setConfirmDelete(false)} />
    </form>
  )
}
