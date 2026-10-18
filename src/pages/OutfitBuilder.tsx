import { useMemo } from 'react'
import { BagIcon, CloseIcon, HangerIcon, Sparkle } from '../components/Icons'
import { AffiliateNote, ErrorState, Price, ProductImg, Spinner, toast } from '../components/ui'
import { cx, money } from '../lib/format'
import { navigate, useLocation } from '../lib/router'
import { useCatalog } from '../lib/useCatalog'
import type { Category, Product } from '../types'
import { addPiecesToBag, PieceRow } from './OutfitPage'

const SLOTS: Array<{ key: string; label: string; cats: Category[] }> = [
  { key: 'top', label: 'Tops & dresses', cats: ['top', 'dress'] },
  { key: 'bottom', label: 'Bottoms', cats: ['bottom'] },
  { key: 'outer', label: 'Layers', cats: ['outerwear'] },
  { key: 'shoes', label: 'Shoes', cats: ['shoes'] },
  { key: 'extras', label: 'Bags & extras', cats: ['bag', 'accessory', 'beauty', 'other'] },
]

export default function OutfitBuilder() {
  const { catalog, error, retry } = useCatalog()
  const { search } = useLocation()
  // The look is kept in the address bar (?items=slug,slug) so it can be shared.
  const picked = useMemo(() => (search.get('items') ?? '').split(',').filter(Boolean), [search])

  if (error) return <div className="px-4 py-16"><ErrorState message={error} onRetry={retry} /></div>
  if (!catalog) return <Spinner />

  const available = catalog.products.filter((p) => !p.is_sold)
  const chosen = picked.map((s) => available.find((p) => p.slug === s)).filter((p): p is Product => Boolean(p))
  const total = chosen.reduce((s, p) => s + p.price_cents, 0)

  const setPicked = (slugs: string[]) => {
    const q = slugs.length ? `?items=${slugs.join(',')}` : ''
    navigate(`/build${q}`, { replace: true, keepScroll: true })
  }
  const toggle = (p: Product) => {
    if (picked.includes(p.slug)) return setPicked(picked.filter((s) => s !== p.slug))
    if (picked.length >= 8) return toast('A look can have up to 8 pieces')
    setPicked([...picked, p.slug])
  }
  const share = async () => {
    const url = window.location.href
    try {
      if (navigator.share) await navigator.share({ title: 'My look', url })
      else {
        await navigator.clipboard.writeText(url)
        toast('Link copied! Paste it anywhere 💕')
      }
    } catch {
      /* share sheet closed */
    }
  }
  const addAll = () => {
    const { added, needSize } = addPiecesToBag(chosen)
    toast(needSize ? `Added ${added}. Pick sizes for ${needSize} more on their pages` : `Added ${added} to your bag 💕`)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10">
      <header className="mb-8 text-center">
        <p className="font-script text-xl text-rose">play dress-up</p>
        <h1 className="text-4xl font-semibold sm:text-5xl">Build a Look</h1>
        <p className="mx-auto mt-3 max-w-lg text-muted">Tap pieces to add them to your look. We’ll add up the total and show where to get each one.</p>
      </header>
      <AffiliateNote className="mb-8" />

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-8">
          {SLOTS.map((slot) => {
            const options = available.filter((p) => slot.cats.includes(p.category))
            if (options.length === 0) return null
            return (
              <section key={slot.key} aria-labelledby={`slot-${slot.key}`}>
                <h2 id={`slot-${slot.key}`} className="mb-3 text-xl font-semibold">{slot.label}</h2>
                <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
                  {options.map((p) => {
                    const on = picked.includes(p.slug)
                    return (
                      <li key={p.id} className="w-36 shrink-0 snap-start sm:w-40">
                        <button
                          onClick={() => toggle(p)}
                          aria-pressed={on}
                          className={cx(
                            'relative block w-full rounded-3xl bg-white p-2 text-left ring-2 transition',
                            on ? 'ring-rose shadow-pop' : 'ring-petal hover:ring-bubblegum',
                          )}
                        >
                          <ProductImg product={p} className="aspect-[4/5] w-full rounded-2xl" />
                          {on && (
                            <span className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-rose text-white">
                              <Sparkle size={14} color="#fff" />
                            </span>
                          )}
                          <span className="mt-2 block truncate px-1 font-display text-sm font-medium">{p.name}</span>
                          <Price product={p} className="block px-1 text-sm text-rose" />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>

        <aside className="lg:sticky lg:top-32 lg:self-start">
          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-xl font-semibold">
                <HangerIcon size={22} className="text-rose" /> Your look
              </h2>
              {chosen.length > 0 && (
                <button className="btn btn-ghost btn-sm" onClick={() => setPicked([])}>
                  <CloseIcon size={16} /> Clear
                </button>
              )}
            </div>
            {chosen.length === 0 ? (
              <p className="rounded-2xl bg-blush px-4 py-8 text-center text-muted">Nothing yet. Tap a piece to start ✦</p>
            ) : (
              <>
                <ul className="space-y-2">
                  {chosen.map((p) => (
                    <PieceRow key={p.id} product={p} />
                  ))}
                </ul>
                <p className="mt-4 flex items-center justify-between font-display text-lg">
                  Total <strong className="text-rose">{money(total)}</strong>
                </p>
                <div className="mt-4 grid gap-2">
                  {chosen.some((p) => p.type !== 'affiliate') && (
                    <button className="btn btn-primary" onClick={addAll}>
                      <BagIcon size={20} /> Add our pieces to bag
                    </button>
                  )}
                  <button className="btn btn-soft" onClick={share}>Share my look</button>
                </div>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
