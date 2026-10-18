import { useState, type ReactNode } from 'react'
import { EyeIcon, EyeOffIcon, PlusIcon } from '../components/Icons'
import { EmptyState, ProductImg, toast } from '../components/ui'
import { cx, money } from '../lib/format'
import { Link } from '../lib/router'
import { store } from '../lib/store'
import type { Product } from '../types'
import { useAdminCtx } from './AdminApp'
import { Hint, PageHeader, reportError, SortableList } from './components'

export const TYPE_LABELS: Record<Product['type'], string> = {
  dropship: 'Supplier ships',
  unique: 'One of one',
  affiliate: 'Link to store',
}

export default function Products() {
  const { catalog, reload } = useAdminCtx()
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<string>('all')

  const filtered = catalog.products
    .filter((p) => tab === 'all' || (tab === 'none' ? !p.tab_id : p.tab_id === tab))
    .filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()))
  const canReorder = !q.trim() && tab !== 'all'

  const patch = async (p: Product, change: Partial<Product>, msg: string) => {
    try {
      await store.updateProduct(p.id, change)
      await reload()
      toast(msg)
    } catch (e) {
      reportError(e)
    }
  }

  const reorder = async (ids: string[]) => {
    try {
      await store.reorder('products', ids)
      await reload()
      toast('New order saved ✓')
    } catch (e) {
      reportError(e)
    }
  }

  const row = (p: Product, handle?: ReactNode) => {
    const tabName = catalog.tabs.find((t) => t.id === p.tab_id)?.name
    return (
      <div className={cx('flex items-center gap-2 rounded-3xl bg-white p-2 ring-2 ring-petal sm:gap-3', !p.is_published && 'opacity-70')}>
        {handle}
        <Link to={`/admin/products/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3">
          <ProductImg product={p} className="h-16 w-13 shrink-0 rounded-2xl" />
          <span className="min-w-0">
            <span className="block truncate font-display font-semibold">{p.name}</span>
            <span className="block truncate text-sm text-muted">
              {money(p.price_cents)} · {TYPE_LABELS[p.type]}{tabName ? ` · ${tabName}` : ''}
            </span>
            <span className="mt-0.5 flex gap-1">
              {!p.is_published && <span className="chip bg-blush text-muted">hidden</span>}
              {p.is_sold && <span className="chip bg-ink text-white">sold</span>}
              {p.is_featured && <span className="chip bg-butter text-ink">featured</span>}
            </span>
          </span>
        </Link>
        <button
          className="btn btn-ghost btn-sm shrink-0 !px-2.5"
          onClick={() => patch(p, { is_published: !p.is_published }, p.is_published ? 'Hidden from the shop' : 'Now live on the shop ✨')}
          aria-label={p.is_published ? `Hide ${p.name}` : `Show ${p.name}`}
          title={p.is_published ? 'Live: tap to hide' : 'Hidden: tap to show'}
        >
          {p.is_published ? <EyeIcon /> : <EyeOffIcon />}
        </button>
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title="Products"
        subtitle="Add, edit, hide or reorder what’s in your shop."
        actions={<Link to="/admin/products/new" className="btn btn-primary"><PlusIcon size={20} /> Add a product</Link>}
      />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input className="field sm:max-w-xs" placeholder="Search products…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search products" />
        <select className="field sm:max-w-xs" value={tab} onChange={(e) => setTab(e.target.value)} aria-label="Show tab">
          <option value="all">All products</option>
          {catalog.tabs.filter((t) => t.kind === 'products').map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
          <option value="none">Not in a tab (outfit/link items)</option>
        </select>
      </div>
      <p className="mb-3 text-sm text-muted">
        {canReorder ? 'Drag the dots to change the order shoppers see.' : 'Pick a tab above to drag products into a new order.'}
        <Hint>The order here is the order shoppers see in that tab. On a phone, press and drag the six dots.</Hint>
      </p>
      {filtered.length === 0 ? (
        <EmptyState title="No products found">Try a different search, or add a new product.</EmptyState>
      ) : canReorder ? (
        <SortableList label="Products" items={filtered} onReorder={reorder} render={(p, handle) => row(p, handle)} />
      ) : (
        <ul className="space-y-2">{filtered.map((p) => <li key={p.id}>{row(p)}</li>)}</ul>
      )}
    </>
  )
}
