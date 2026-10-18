import { useMemo, useState } from 'react'
import { OutfitCard } from '../components/OutfitCard'
import { ProductGrid } from '../components/ProductCard'
import { AffiliateNote, EmptyState, ErrorState, Spinner } from '../components/ui'
import { cx } from '../lib/format'
import { Link } from '../lib/router'
import { useCatalog } from '../lib/useCatalog'
import type { Category, Product } from '../types'
import NotFound from './NotFound'

const CATEGORY_LABELS: Record<Category, string> = {
  top: 'Tops', bottom: 'Bottoms', dress: 'Dresses', outerwear: 'Outerwear', shoes: 'Shoes',
  bag: 'Bags', accessory: 'Accessories', beauty: 'Beauty', other: 'Other',
}
type Sort = 'featured' | 'low' | 'high' | 'new'

export default function TabPage({ slug }: { slug: string }) {
  const { catalog, error, retry } = useCatalog()
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [sort, setSort] = useState<Sort>('featured')

  const tab = catalog?.tabs.find((t) => t.slug === slug)
  const items = useMemo(() => {
    if (!catalog || !tab) return []
    let list = catalog.products.filter((p) => p.tab_id === tab.id)
    if (category !== 'all') list = list.filter((p) => p.category === category)
    const sorted = [...list]
    if (sort === 'low') sorted.sort((a, b) => a.price_cents - b.price_cents)
    if (sort === 'high') sorted.sort((a, b) => b.price_cents - a.price_cents)
    if (sort === 'new') sorted.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
    // sold pieces drift to the end
    return sorted.sort((a, b) => Number(a.is_sold) - Number(b.is_sold))
  }, [catalog, tab, category, sort])

  if (error) return <div className="px-4 py-16"><ErrorState message={error} onRetry={retry} /></div>
  if (!catalog) return <Spinner />
  if (!tab) return <NotFound />

  const allInTab: Product[] = catalog.products.filter((p) => p.tab_id === tab.id)
  const categories = [...new Set(allInTab.map((p) => p.category))]
  const outfits = catalog.outfits.filter((o) => o.tab_id === tab.id)

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10">
      <header className="mb-8 text-center">
        <p className="font-script text-xl text-rose">shop</p>
        <h1 className="text-4xl font-semibold sm:text-5xl">{tab.name}</h1>
        {tab.description && <p className="mx-auto mt-3 max-w-xl text-muted">{tab.description}</p>}
      </header>

      {tab.kind === 'outfits' ? (
        outfits.length === 0 ? (
          <EmptyState title="New looks coming soon!">We’re styling something cute. Check back soon.</EmptyState>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {outfits.map((o) => (
              <li key={o.id}>
                <OutfitCard outfit={o} products={catalog.products} />
              </li>
            ))}
          </ul>
        )
      ) : allInTab.length === 0 ? (
        <EmptyState title="Nothing here yet!">
          New pieces are on the way. Meanwhile, <Link to="/" className="text-rose underline">see what’s new</Link>.
        </EmptyState>
      ) : (
        <>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filter by type">
              {(['all', ...categories] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  aria-pressed={category === c}
                  className={cx(
                    'btn btn-sm shrink-0',
                    category === c ? 'bg-ink text-white' : 'btn-soft',
                  )}
                >
                  {c === 'all' ? 'Everything' : CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 self-end text-sm sm:self-auto">
              <span className="font-display font-medium">Sort</span>
              <select className="field !min-h-10 !w-auto !py-1.5" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                <option value="featured">Our picks</option>
                <option value="new">Newest</option>
                <option value="low">Price: low to high</option>
                <option value="high">Price: high to low</option>
              </select>
            </label>
          </div>
          {allInTab.some((p) => p.type === 'affiliate') && <AffiliateNote className="mb-6" />}
          <ProductGrid products={items} />
        </>
      )}
    </div>
  )
}
