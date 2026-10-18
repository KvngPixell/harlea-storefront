import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { CheckIcon, CloseIcon, ExternalIcon, PlusIcon, TrashIcon } from '../components/Icons'
import { EmptyState, ErrorState, Spinner, toast } from '../components/ui'
import { cx, money, parseMoney, shortDate, slugify, uid } from '../lib/format'
import { navigate } from '../lib/router'
import { store } from '../lib/store'
import type { Idea, IdeaStatus, IdeaSuggestion } from '../types'
import { useAdminCtx } from './AdminApp'
import { ConfirmDialog, Field, Hint, PageHeader, Panel, PhotoManager, reportError } from './components'

const STATUSES: Array<{ value: IdeaStatus; label: string; cls: string }> = [
  { value: 'new', label: 'New', cls: 'bg-butter text-ink' },
  { value: 'sourcing', label: 'Finding pieces', cls: 'bg-lilac text-lilac-deep' },
  { value: 'ready', label: 'Ready for review', cls: 'bg-rose text-white' },
  { value: 'published', label: 'Published', cls: 'bg-ink text-white' },
]

function NewIdea({ onSaved }: { onSaved: () => void }) {
  const [photo, setPhoto] = useState<Array<{ url: string; alt: string }>>([])
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!photo.length && !notes.trim() && !title.trim()) return toast('Add a photo or a few words first')
    setBusy(true)
    try {
      await store.saveIdea({ title: title.trim() || 'Untitled idea', notes: notes.trim(), image_url: photo[0]?.url ?? null, status: 'new', suggestions: [] })
      setPhoto([]); setTitle(''); setNotes('')
      toast('Idea saved 💡')
      onSaved()
    } catch (err) {
      reportError(err)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Panel title="Add an idea">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-[160px_1fr]">
        <PhotoManager photos={photo} onChange={(p) => setPhoto(p.slice(-1))} folder="ideas" max={1} />
        <div className="space-y-3">
          <Field label="Title"><input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Pink gingham picnic look" maxLength={80} /></Field>
          <Field label="Notes"><textarea className="field min-h-20" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What do you love about it? Budget? Colors?" maxLength={1500} /></Field>
          <button className="btn btn-primary" disabled={busy}><PlusIcon size={18} /> {busy ? 'Saving…' : 'Save idea'}</button>
        </div>
      </form>
    </Panel>
  )
}

function AddSuggestion({ onAdd }: { onAdd: (s: IdeaSuggestion) => void }) {
  const [open, setOpen] = useState(false)
  const [s, setS] = useState({ name: '', store: '', url: '', price: '' })
  if (!open) return <button className="btn btn-ghost btn-sm !px-0" onClick={() => setOpen(true)}><PlusIcon size={16} /> Add a matching piece</button>
  const add = () => {
    if (!s.name.trim() || !/^https:\/\//.test(s.url.trim())) return toast('Add a name and a link starting with https://')
    onAdd({ name: s.name.trim(), store: s.store.trim() || 'Store', url: s.url.trim(), price_cents: parseMoney(s.price), decision: null })
    setS({ name: '', store: '', url: '', price: '' })
    setOpen(false)
  }
  return (
    <div className="grid gap-2 rounded-2xl bg-blush p-3 sm:grid-cols-2">
      <input className="field" placeholder="Piece name" value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} aria-label="Piece name" />
      <input className="field" placeholder="Store" value={s.store} onChange={(e) => setS({ ...s, store: e.target.value })} aria-label="Store" />
      <input className="field" placeholder="https://link" value={s.url} onChange={(e) => setS({ ...s, url: e.target.value })} aria-label="Link" />
      <input className="field" placeholder="Price ($)" inputMode="decimal" value={s.price} onChange={(e) => setS({ ...s, price: e.target.value })} aria-label="Price" />
      <div className="flex gap-2 sm:col-span-2">
        <button type="button" className="btn btn-primary btn-sm" onClick={add}>Add</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  )
}

function IdeaCard({ idea, onChange, onDelete }: { idea: Idea; onChange: (i: Idea) => void; onDelete: () => void }) {
  const { catalog, reload } = useAdminCtx()
  const [busy, setBusy] = useState(false)
  const status = STATUSES.find((s) => s.value === idea.status) ?? STATUSES[0]
  const approved = idea.suggestions.filter((s) => s.decision === 'approved')

  const save = async (patch: Partial<Idea>) => {
    try {
      onChange(await store.saveIdea({ ...idea, ...patch }))
    } catch (e) {
      reportError(e)
    }
  }
  const decide = (i: number, decision: IdeaSuggestion['decision']) =>
    save({ suggestions: idea.suggestions.map((s, k) => (k === i ? { ...s, decision } : s)) })

  const makeOutfit = async () => {
    setBusy(true)
    try {
      const ids: string[] = []
      for (const s of approved) {
        let slug = slugify(`${s.name}-${s.store}`) || `piece-${uid().slice(0, 8)}`
        if (catalog.products.some((p) => p.slug === slug)) slug = `${slug}-${uid().slice(0, 4)}`
        const p = await store.saveProduct(
          { name: s.name, slug, description: s.note ?? '', type: 'affiliate', category: 'other', price_cents: s.price_cents ?? 0,
            compare_at_cents: null, sizes: [], tab_id: null, store_name: s.store, affiliate_url: s.url, is_featured: false,
            is_sold: false, is_published: false, sort_order: catalog.products.length + ids.length + 1 },
          s.image_url ? [{ url: s.image_url, alt: s.name }] : [],
        )
        ids.push(p.id)
      }
      let slug = slugify(idea.title) || `look-${uid().slice(0, 6)}`
      if (catalog.outfits.some((o) => o.slug === slug)) slug = `${slug}-${uid().slice(0, 4)}`
      const outfit = await store.saveOutfit(
        { name: idea.title, slug, description: idea.notes, tab_id: catalog.tabs.find((t) => t.kind === 'outfits')?.id ?? null,
          cover_image_url: idea.image_url, is_published: false, sort_order: catalog.outfits.length + 1 },
        ids,
      )
      await store.saveIdea({ ...idea, status: 'ready' })
      await reload()
      toast('Draft outfit made! Review it, then turn on “Show on the shop”.')
      navigate(`/admin/outfits/${outfit.id}`)
    } catch (e) {
      reportError(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="card overflow-hidden">
      <div className="grid sm:grid-cols-[180px_1fr]">
        {idea.image_url ? <img src={idea.image_url} alt="" className="h-56 w-full object-cover sm:h-full" /> : <div className="hidden bg-blush sm:block" />}
        <div className="space-y-3 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="font-display text-lg font-semibold">{idea.title}</h3>
              <p className="text-xs text-muted">added {shortDate(idea.created_at)}</p>
            </div>
            <div className="flex items-center gap-1">
              <select className={cx('chip !py-1.5', status.cls)} value={idea.status} onChange={(e) => save({ status: e.target.value as IdeaStatus })} aria-label="Status">
                {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <button className="btn btn-ghost btn-sm !px-2" onClick={onDelete} aria-label="Delete idea"><TrashIcon size={18} /></button>
            </div>
          </div>
          {idea.notes && <p className="whitespace-pre-line text-sm">{idea.notes}</p>}
          <div>
            <p className="label !mb-2 text-sm">Matching pieces {idea.suggestions.length > 0 && `(${idea.suggestions.length})`}</p>
            {idea.suggestions.length === 0 && <p className="mb-2 text-sm text-muted">None yet. Claude or Isaac will add matches here, or add your own.</p>}
            <ul className="space-y-2">
              {idea.suggestions.map((s, i) => (
                <li key={`${s.url}-${i}`} className={cx('flex items-center gap-2 rounded-2xl p-2 ring-2', s.decision === 'approved' ? 'bg-blush ring-rose' : s.decision === 'rejected' ? 'opacity-50 ring-petal' : 'ring-petal')}>
                  {s.image_url && <img src={s.image_url} alt="" className="h-12 w-10 rounded-lg object-cover" />}
                  <div className="min-w-0 flex-1 text-sm">
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 truncate font-semibold hover:text-rose">{s.name} <ExternalIcon size={14} /></a>
                    <span className="text-muted">{s.store}{s.price_cents != null ? ` · ${money(s.price_cents)}` : ''}{s.note ? ` · ${s.note}` : ''}</span>
                  </div>
                  <button className={cx('grid h-9 w-9 place-items-center rounded-full', s.decision === 'approved' ? 'bg-rose text-white' : 'hover:bg-blush')} aria-label={`Approve ${s.name}`} onClick={() => decide(i, s.decision === 'approved' ? null : 'approved')}><CheckIcon size={18} /></button>
                  <button className="grid h-9 w-9 place-items-center rounded-full hover:bg-blush" aria-label={`Skip ${s.name}`} onClick={() => decide(i, s.decision === 'rejected' ? null : 'rejected')}><CloseIcon size={18} /></button>
                </li>
              ))}
            </ul>
            <div className="mt-2"><AddSuggestion onAdd={(s) => save({ suggestions: [...idea.suggestions, s] })} /></div>
          </div>
          {approved.length > 0 && (
            <button className="btn btn-primary btn-sm" onClick={makeOutfit} disabled={busy}>
              {busy ? 'Making it…' : `Make an outfit from ${approved.length} approved piece${approved.length > 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      </div>
    </li>
  )
}

export default function Ideas() {
  const [ideas, setIdeas] = useState<Idea[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<IdeaStatus | 'all'>('all')
  const [deleting, setDeleting] = useState<Idea | null>(null)

  const load = useCallback(() => store.listIdeas().then((i) => { setIdeas(i); setError(null) }, () => setError('Couldn’t load ideas.')), [])
  useEffect(() => {
    void load()
  }, [load])

  const shown = (ideas ?? []).filter((i) => filter === 'all' || i.status === filter)

  return (
    <>
      <PageHeader title="Idea inbox" subtitle="Drop outfit pics and fashion ideas here. We find the pieces; you approve them." />
      <div className="mb-5 rounded-3xl bg-lilac/70 px-5 py-4 text-sm text-ink">
        <strong className="font-display">How it works:</strong> 1) Add a pic or idea. 2) Claude or Isaac finds matching pieces and adds them (status “Ready for review”).
        3) Tap ✓ on the ones you like. 4) Tap “Make an outfit”. Nothing goes live until you turn it on.
        <Hint>Matches are saved as “Link to another store” products. They stay hidden until you show the outfit and its pieces.</Hint>
      </div>
      <NewIdea onSaved={() => void load()} />
      <div className="my-5 flex flex-wrap gap-2" role="group" aria-label="Filter ideas">
        {[{ value: 'all' as const, label: 'All' }, ...STATUSES].map((s) => (
          <button key={s.value} onClick={() => setFilter(s.value)} aria-pressed={filter === s.value} className={cx('btn btn-sm', filter === s.value ? 'bg-ink text-white' : 'btn-soft')}>
            {s.label}
          </button>
        ))}
      </div>
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {!ideas && !error && <Spinner />}
      {ideas && shown.length === 0 && <EmptyState title="No ideas here yet">Add your first one above!</EmptyState>}
      <ul className="space-y-4">
        {shown.map((idea) => (
          <IdeaCard key={idea.id} idea={idea} onChange={(next) => setIdeas((xs) => xs?.map((x) => (x.id === next.id ? next : x)) ?? null)} onDelete={() => setDeleting(idea)} />
        ))}
      </ul>
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this idea?"
        body="Its photo and matches are removed. Outfits you already made stay."
        onConfirm={async () => {
          const i = deleting!
          setDeleting(null)
          try {
            await store.deleteIdea(i.id)
            setIdeas((xs) => xs?.filter((x) => x.id !== i.id) ?? null)
            toast('Idea deleted')
          } catch (e) {
            reportError(e)
          }
        }}
        onCancel={() => setDeleting(null)}
      />
    </>
  )
}
