// Building blocks for Harlea's dashboard.
import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { ArrowLeftIcon, ArrowRightIcon, CloseIcon, GripIcon, HelpIcon, TrashIcon, UploadIcon } from '../components/Icons'
import { toast } from '../components/ui'
import { cx } from '../lib/format'
import { store } from '../lib/store'

/** A little "?" that explains something in plain English (works with tap, not just hover). */
export function Hint({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative inline-block align-middle">
      <button
        type="button"
        className="ml-1 grid h-7 w-7 place-items-center rounded-full text-muted hover:bg-blush hover:text-rose"
        aria-label="What’s this?"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setOpen(false)}
      >
        <HelpIcon size={18} />
      </button>
      {open && (
        <span role="tooltip" className="absolute left-1/2 top-8 z-30 w-64 -translate-x-1/2 animate-pop-in rounded-2xl bg-ink px-4 py-3 text-left font-body text-sm font-normal leading-snug text-white shadow-lg">
          {children}
        </span>
      )}
    </span>
  )
}

export function Toggle({ checked, onChange, label, hint, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: ReactNode; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="font-display font-medium">
        {label}
        {hint && <Hint>{hint}</Hint>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx('relative h-8 w-14 shrink-0 rounded-full transition disabled:opacity-50', checked ? 'bg-rose' : 'bg-petal')}
      >
        <span className={cx('absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all', checked ? 'left-7' : 'left-1')} />
      </button>
    </div>
  )
}

export function Field({ label, hint, children, error }: { label: string; hint?: ReactNode; children: ReactNode; error?: string | null }) {
  return (
    <label className="block">
      <span className="label">
        {label}
        {hint && <Hint>{hint}</Hint>}
      </span>
      {children}
      {error && <span className="mt-1 block text-sm text-rose">{error}</span>}
    </label>
  )
}

export function Panel({ title, children, actions, className }: { title?: ReactNode; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <section className={cx('card p-5', className)}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="text-xl font-semibold">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

/** Pop-up "are you sure?" box. */
export function ConfirmDialog({ open, title, body, confirmLabel = 'Yes, delete', onConfirm, onCancel }: {
  open: boolean; title: string; body?: ReactNode; confirmLabel?: string; onConfirm: () => void; onCancel: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog ref={ref} onCancel={onCancel} className="m-auto w-[min(92vw,26rem)] rounded-[var(--radius-blob)] bg-white p-0 text-ink shadow-2xl backdrop:bg-ink/40">
      <div className="p-6">
        <h2 className="text-xl font-semibold">{title}</h2>
        {body && <div className="mt-2 text-muted">{body}</div>}
        <div className="mt-6 flex justify-end gap-2">
          <button className="btn btn-soft btn-sm" onClick={onCancel}>Never mind</button>
          <button className="btn btn-primary btn-sm" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </dialog>
  )
}

/**
 * Drag-to-reorder list (mouse + touch) with arrow buttons as a backup.
 * Calls onReorder with the new id order when you let go.
 */
export function SortableList<T extends { id: string }>({ items, onReorder, render, label }: {
  items: T[]; onReorder: (ids: string[]) => void; render: (item: T, handle: ReactNode, move: (dir: -1 | 1) => void) => ReactNode; label: string
}) {
  const [order, setOrder] = useState(items.map((i) => i.id))
  const [dragging, setDragging] = useState<string | null>(null)
  const refs = useRef(new Map<string, HTMLLIElement>())
  const itemKey = items.map((i) => i.id).join(',')

  useEffect(() => {
    if (!dragging) setOrder(itemKey ? itemKey.split(',') : [])
  }, [itemKey, dragging])

  const byId = new Map(items.map((i) => [i.id, i]))
  const commit = (ids: string[]) => {
    if (ids.join(',') !== itemKey) onReorder(ids)
  }

  const onPointerDown = (id: string) => (e: PointerEvent) => {
    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    setDragging(id)
  }
  const onPointerMove = (e: PointerEvent) => {
    if (!dragging) return
    const y = e.clientY
    setOrder((current) => {
      const from = current.indexOf(dragging)
      for (const [id, el] of refs.current) {
        if (id === dragging || !el) continue
        const r = el.getBoundingClientRect()
        if (y > r.top && y < r.bottom) {
          const to = current.indexOf(id)
          const goingDown = to > from
          if ((goingDown && y > r.top + r.height / 2) || (!goingDown && y < r.top + r.height / 2)) {
            const next = [...current]
            next.splice(from, 1)
            next.splice(to, 0, dragging)
            return next
          }
        }
      }
      return current
    })
  }
  const onPointerUp = () => {
    if (!dragging) return
    setDragging(null)
    commit(order)
  }

  return (
    <ul aria-label={label} className="space-y-2" onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
      {order.map((id, index) => {
        const item = byId.get(id)
        if (!item) return null
        const move = (dir: -1 | 1) => {
          const to = index + dir
          if (to < 0 || to >= order.length) return
          const next = [...order]
          next.splice(index, 1)
          next.splice(to, 0, id)
          setOrder(next)
          commit(next)
        }
        const handle = (
          <button
            type="button"
            aria-label="Drag to reorder (or use arrow keys)"
            className="grid h-11 w-9 shrink-0 cursor-grab touch-none place-items-center rounded-xl text-muted hover:bg-blush active:cursor-grabbing"
            onPointerDown={onPointerDown(id)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowUp') { e.preventDefault(); move(-1) }
              if (e.key === 'ArrowDown') { e.preventDefault(); move(1) }
            }}
          >
            <GripIcon size={20} />
          </button>
        )
        return (
          <li
            key={id}
            ref={(el) => {
              if (el) refs.current.set(id, el)
              else refs.current.delete(id)
            }}
            className={cx('transition-transform', dragging === id && 'relative z-10 scale-[1.02] opacity-90 drop-shadow-xl')}
          >
            {render(item, handle, move)}
          </li>
        )
      })}
    </ul>
  )
}

/** Photo uploader: add, reorder (first = main photo) and remove photos. */
export function PhotoManager({ photos, onChange, folder = 'products', max = 8 }: {
  photos: Array<{ id?: string; url: string; alt: string }>
  onChange: (p: Array<{ id?: string; url: string; alt: string }>) => void
  folder?: 'products' | 'ideas' | 'outfits'
  max?: number
}) {
  const [uploading, setUploading] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const latest = useRef(photos)
  latest.current = photos

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setError(null)
    const list = [...files].slice(0, Math.max(0, max - photos.length))
    if (list.length < files.length) setError(`Up to ${max} photos per item.`)
    setUploading((n) => n + list.length)
    for (const file of list) {
      try {
        const url = await store.uploadImage(file, folder)
        latest.current = [...latest.current, { url, alt: '' }]
        onChange(latest.current)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Upload failed. Please try again.')
      } finally {
        setUploading((n) => n - 1)
      }
    }
    if (input.current) input.current.value = ''
  }

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= photos.length) return
    const next = [...photos]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  return (
    <div>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {photos.map((p, i) => (
          <li key={p.url} className="group relative overflow-hidden rounded-2xl ring-2 ring-petal">
            <img src={p.url} alt="" className="aspect-[4/5] w-full object-cover" />
            {i === 0 && <span className="chip absolute left-1.5 top-1.5 bg-rose text-white">main</span>}
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-ink/70 to-transparent p-1.5">
              <button type="button" className="grid h-8 w-8 place-items-center rounded-full bg-white/90 disabled:opacity-40" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move photo left">
                <ArrowLeftIcon size={16} />
              </button>
              <button type="button" className="grid h-8 w-8 place-items-center rounded-full bg-white/90 text-rose" onClick={() => onChange(photos.filter((_, k) => k !== i))} aria-label="Remove photo">
                <TrashIcon size={16} />
              </button>
              <button type="button" className="grid h-8 w-8 place-items-center rounded-full bg-white/90 disabled:opacity-40" onClick={() => move(i, 1)} disabled={i === photos.length - 1} aria-label="Move photo right">
                <ArrowRightIcon size={16} />
              </button>
            </div>
          </li>
        ))}
        {Array.from({ length: uploading }, (_, i) => (
          <li key={`up-${i}`} className="grid aspect-[4/5] animate-pulse place-items-center rounded-2xl bg-blush text-sm text-muted">Uploading…</li>
        ))}
        {photos.length + uploading < max && (
          <li>
            <button
              type="button"
              onClick={() => input.current?.click()}
              className="grid aspect-[4/5] w-full place-items-center rounded-2xl border-2 border-dashed border-bubblegum bg-white text-rose transition hover:bg-blush"
            >
              <span className="flex flex-col items-center gap-1 font-display text-sm font-semibold">
                <UploadIcon /> Add photos
              </span>
            </button>
          </li>
        )}
      </ul>
      <input ref={input} type="file" accept="image/*" multiple className="sr-only" onChange={(e) => addFiles(e.target.files)} />
      {error && (
        <p role="alert" className="mt-2 flex items-center justify-between rounded-xl bg-blush px-3 py-2 text-sm text-rose">
          {error}
          <button type="button" onClick={() => setError(null)} aria-label="Dismiss"><CloseIcon size={16} /></button>
        </p>
      )}
    </div>
  )
}

/** Shows a friendly message when a save fails. */
export function reportError(e: unknown, fallback = 'Something went wrong. Please try again.') {
  const msg = e instanceof Error ? e.message : fallback
  const friendly = /duplicate key|23505/.test(msg)
    ? 'That name is already used by something else. Try a slightly different one.'
    : /JWT|401|log in/i.test(msg)
      ? 'You were logged out. Please log in again.'
      : msg
  toast(friendly)
}
