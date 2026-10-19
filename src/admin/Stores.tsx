import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ExternalIcon, PlusIcon, TrashIcon } from '../components/Icons'
import { EmptyState, ErrorState, Spinner, toast } from '../components/ui'
import { cx } from '../lib/format'
import { store } from '../lib/store'
import type { StoreEntry, StoreKind, StoreStatus } from '../types'
import { ConfirmDialog, Field, Hint, PageHeader, reportError } from './components'

export const KINDS: Array<{ value: StoreKind; label: string; help: string }> = [
  { value: 'affiliate', label: 'Affiliate programs', help: 'Earn a commission when people buy through your links.' },
  { value: 'supplier', label: 'Dropship suppliers', help: 'They ship to your buyer; you set the price.' },
  { value: 'wholesale', label: 'Wholesale', help: 'Buy pieces in bulk to resell.' },
  { value: 'channel', label: 'Places to sell', help: 'Free places that can show your products (Google, Pinterest, Instagram…).' },
  { value: 'tool', label: 'Tools', help: 'Helpful apps (email, design…).' },
  { value: 'store', label: 'Stores I love', help: 'Shops you link to in outfits.' },
]
export const STATUSES: Array<{ value: StoreStatus; label: string; cls: string }> = [
  { value: 'idea', label: 'To look at', cls: 'bg-butter text-ink' },
  { value: 'applied', label: 'Applied', cls: 'bg-lilac text-lilac-deep' },
  { value: 'approved', label: 'Approved', cls: 'bg-blush text-rose' },
  { value: 'active', label: 'Using it', cls: 'bg-rose text-white' },
  { value: 'later', label: 'Later', cls: 'bg-cream text-muted ring-1 ring-petal' },
  { value: 'not_a_fit', label: 'Not a fit', cls: 'bg-ink/10 text-muted' },
]
const statusOf = (s: StoreStatus) => STATUSES.find((x) => x.value === s) ?? STATUSES[0]
const blank = (kind: StoreKind): Partial<StoreEntry> & { name: string } => ({
  name: '', kind, status: 'idea', website_url: '', signup_url: '', commission: '', requirements: '', payout: '', cost: '', my_id: '', notes: '',
})

function StoreForm({ initial, onDone }: { initial: Partial<StoreEntry> & { name: string }; onDone: (saved?: StoreEntry) => void }) {
  const [f, setF] = useState(initial)
  const [busy, setBusy] = useState(false)
  const set = (k: keyof StoreEntry, v: string) => setF((x) => ({ ...x, [k]: v }))
  const url = (v?: string | null) => {
    const t = (v ?? '').trim()
    if (!t) return null
    return /^https?:\/\//.test(t) ? t : `https://${t}`
  }
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!f.name.trim()) return toast('Give it a name')
    setBusy(true)
    try {
      const saved = await store.saveStore({ ...f, name: f.name.trim(), website_url: url(f.website_url), signup_url: url(f.signup_url) })
      toast(initial.id ? 'Saved ✓' : 'Added ✨')
      onDone(saved)
    } catch (err) {
      reportError(err)
    } finally {
      setBusy(false)
    }
  }
  return (
    <form onSubmit={submit} className="space-y-3 rounded-3xl bg-blush p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name"><input className="field" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. ShopMy" autoFocus /></Field>
        <Field label="Type">
          <select className="field" value={f.kind} onChange={(e) => set('kind', e.target.value)}>
            {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
          </select>
        </Field>
        <Field label="Website"><input className="field" value={f.website_url ?? ''} onChange={(e) => set('website_url', e.target.value)} placeholder="https://…" /></Field>
        <Field label="Sign-up / apply link"><input className="field" value={f.signup_url ?? ''} onChange={(e) => set('signup_url', e.target.value)} placeholder="https://…" /></Field>
        <Field label="Status">
          <select className="field" value={f.status} onChange={(e) => set('status', e.target.value)}>
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </Field>
        <Field label="My ID / tag" hint="Your affiliate or creator ID (NOT your password). Handy when making links."><input className="field" value={f.my_id ?? ''} onChange={(e) => set('my_id', e.target.value)} /></Field>
        <Field label="Commission / what you earn"><input className="field" value={f.commission ?? ''} onChange={(e) => set('commission', e.target.value)} /></Field>
        <Field label="Requirements"><input className="field" value={f.requirements ?? ''} onChange={(e) => set('requirements', e.target.value)} /></Field>
        <Field label="Payout"><input className="field" value={f.payout ?? ''} onChange={(e) => set('payout', e.target.value)} /></Field>
        <Field label="Cost"><input className="field" value={f.cost ?? ''} onChange={(e) => set('cost', e.target.value)} /></Field>
      </div>
      <Field label="Notes"><textarea className="field min-h-20" value={f.notes ?? ''} onChange={(e) => set('notes', e.target.value)} /></Field>
      <p className="text-xs text-muted">🔒 Never save passwords here. Use a password manager for logins.</p>
      <div className="flex gap-2">
        <button className="btn btn-primary btn-sm" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onDone()}>Cancel</button>
      </div>
    </form>
  )
}

export default function Stores() {
  const [rows, setRows] = useState<StoreEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [kind, setKind] = useState<StoreKind | 'all'>('all')
  const [hideDone, setHideDone] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<StoreEntry | null>(null)

  const load = useCallback(() => store.listStores().then((r) => { setRows(r); setError(null) }, () => setError('Couldn’t load your list.')), [])
  useEffect(() => {
    void load()
  }, [load])

  const setStatus = async (row: StoreEntry, status: StoreStatus) => {
    try {
      const saved = await store.saveStore({ ...row, status })
      setRows((xs) => xs?.map((x) => (x.id === saved.id ? saved : x)) ?? null)
    } catch (e) {
      reportError(e)
    }
  }

  const visible = (rows ?? [])
    .filter((r) => kind === 'all' || r.kind === kind)
    .filter((r) => !hideDone || r.status !== 'not_a_fit')

  return (
    <>
      <PageHeader
        title="Stores & programs"
        subtitle="Your list of affiliate programs, suppliers, places to sell and stores you love. Tap any card to edit."
        actions={<button className="btn btn-primary" onClick={() => setEditing('new')}><PlusIcon size={20} /> Add one</button>}
      />
      <div className="mb-4 rounded-3xl bg-lilac/70 px-5 py-4 text-sm">
        <strong className="font-display">Start here:</strong> apply to <strong>ShopMy</strong> and <strong>Mavely</strong> first (you qualify now),
        then <strong>Amazon</strong>. Change the status as you go. When you’re approved, paste your product links into products with type
        “Link to another store”.
        <Hint>The starter list was researched in Oct 2026. Programs change their rules, so double-check on their site before applying.</Hint>
      </div>
      {editing === 'new' && <div className="mb-4"><StoreForm initial={blank(kind === 'all' ? 'store' : kind)} onDone={(saved) => { setEditing(null); if (saved) void load() }} /></div>}
      <div className="mb-4 flex flex-wrap items-center gap-2" role="group" aria-label="Filter">
        {[{ value: 'all' as const, label: 'All' }, ...KINDS].map((k) => (
          <button key={k.value} onClick={() => setKind(k.value)} aria-pressed={kind === k.value} className={cx('btn btn-sm', kind === k.value ? 'bg-ink text-white' : 'btn-soft')}>
            {k.label}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-sm">
          <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} className="h-4 w-4 accent-[var(--color-rose)]" />
          Hide “not a fit”
        </label>
      </div>
      {kind !== 'all' && <p className="mb-3 text-sm text-muted">{KINDS.find((k) => k.value === kind)?.help}</p>}
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {!rows && !error && <Spinner />}
      {rows && visible.length === 0 && <EmptyState title="Nothing here yet">Tap “Add one” to save a store or program.</EmptyState>}
      <ul className="grid gap-3 md:grid-cols-2">
        {visible.map((r) =>
          editing === r.id ? (
            <li key={r.id} className="md:col-span-2"><StoreForm initial={r} onDone={(saved) => { setEditing(null); if (saved) setRows((xs) => xs?.map((x) => (x.id === saved.id ? saved : x)) ?? null) }} /></li>
          ) : (
            <li key={r.id} className="card flex flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <button className="min-w-0 text-left" onClick={() => setEditing(r.id)}>
                  <span className="block font-display text-lg font-semibold leading-tight">{r.name}</span>
                  <span className="text-xs text-muted">{KINDS.find((k) => k.value === r.kind)?.label}</span>
                </button>
                <select className={cx('chip shrink-0 !py-1.5', statusOf(r.status).cls)} value={r.status} onChange={(e) => setStatus(r, e.target.value as StoreStatus)} aria-label={`Status for ${r.name}`}>
                  {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <dl className="space-y-1 text-sm">
                {r.commission && <div><dt className="inline font-semibold">Earn: </dt><dd className="inline">{r.commission}</dd></div>}
                {r.requirements && <div><dt className="inline font-semibold">Needs: </dt><dd className="inline">{r.requirements}</dd></div>}
                {r.payout && <div><dt className="inline font-semibold">Payout: </dt><dd className="inline">{r.payout}</dd></div>}
                {r.cost && <div><dt className="inline font-semibold">Cost: </dt><dd className="inline">{r.cost}</dd></div>}
                {r.my_id && <div><dt className="inline font-semibold">My ID: </dt><dd className="inline break-all">{r.my_id}</dd></div>}
              </dl>
              {r.notes && <p className="rounded-2xl bg-blush px-3 py-2 text-sm">{r.notes}</p>}
              <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                {r.signup_url && <a href={r.signup_url} target="_blank" rel="noopener noreferrer" className="btn btn-soft btn-sm">Apply / sign up <ExternalIcon size={14} /></a>}
                {r.website_url && r.website_url !== r.signup_url && <a href={r.website_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">Website <ExternalIcon size={14} /></a>}
                <button className="btn btn-ghost btn-sm ml-auto !px-2" aria-label={`Delete ${r.name}`} onClick={() => setDeleting(r)}><TrashIcon size={18} /></button>
              </div>
            </li>
          ),
        )}
      </ul>
      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Remove “${deleting?.name ?? ''}”?`}
        body="It’s removed from your list only."
        confirmLabel="Yes, remove"
        onConfirm={async () => {
          const r = deleting!
          setDeleting(null)
          try {
            await store.deleteStore(r.id)
            setRows((xs) => xs?.filter((x) => x.id !== r.id) ?? null)
            toast('Removed')
          } catch (e) {
            reportError(e)
          }
        }}
        onCancel={() => setDeleting(null)}
      />
    </>
  )
}
