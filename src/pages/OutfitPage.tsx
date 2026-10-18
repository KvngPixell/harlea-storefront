import { useEffect } from 'react'
import { ArrowLeftIcon, BagIcon, ExternalIcon } from '../components/Icons'
import { OutfitCollage, outfitPieces, outfitTotal } from '../components/OutfitCard'
import { AffiliateNote, EmptyState, ErrorState, Price, ProductImg, Spinner, toast } from '../components/ui'
import { bag } from '../lib/bag'
import { money } from '../lib/format'
import { Link, navigate } from '../lib/router'
import { useCatalog } from '../lib/useCatalog'
import type { Product } from '../types'
import NotFound from './NotFound'

export function PieceRow({ product }: { product: Product }) {
  const isAffiliate = product.type === 'affiliate'
  return (
    <li className="flex items-center gap-3 rounded-3xl bg-white p-2.5 ring-2 ring-petal sm:gap-4">
      <Link to={`/p/${product.slug}`} className="shrink-0">
        <ProductImg product={product} className="h-24 w-20 rounded-2xl" />
      </Link>
      <div className="min-w-0 flex-1">
        <Link to={`/p/${product.slug}`} className="block truncate font-display text-lg font-medium hover:text-rose">
          {product.name}
        </Link>
        <Price product={product} className="text-rose" />
        <p className="text-sm text-muted">
          {product.is_sold ? 'Sold out' : isAffiliate ? `at ${product.store_name ?? 'partner store'}` : 'in our shop'}
        </p>
      </div>
      {!product.is_sold &&
        (isAffiliate ? (
          <a href={product.affiliate_url ?? '#'} target="_blank" rel="sponsored noopener noreferrer" className="btn btn-soft btn-sm shrink-0" aria-label={`Buy ${product.name} at ${product.store_name ?? 'partner store'}`}>
            Buy <ExternalIcon size={16} />
          </a>
        ) : (
          <Link to={`/p/${product.slug}`} className="btn btn-soft btn-sm shrink-0" aria-label={`View ${product.name}`}>
            View
          </Link>
        ))}
    </li>
  )
}

/** Adds every piece we sell (that has no size choice) to the bag; returns how many need a size. */
export function addPiecesToBag(pieces: Product[]): { added: number; needSize: number } {
  let added = 0
  let needSize = 0
  for (const p of pieces) {
    if (p.type === 'affiliate' || p.is_sold) continue
    if (p.sizes.length > 1) {
      needSize++
      continue
    }
    if (bag.add(p.id, p.sizes[0] ?? null, 1, p.type === 'unique' ? 1 : 10).ok) added++
  }
  return { added, needSize }
}

export default function OutfitPage({ slug }: { slug: string }) {
  const { catalog, error, retry } = useCatalog()
  const outfit = catalog?.outfits.find((o) => o.slug === slug)

  useEffect(() => {
    if (outfit) document.title = `${outfit.name} · ${catalog?.settings.brand_name ?? ''}`
  }, [outfit, catalog?.settings.brand_name])

  if (error) return <div className="px-4 py-16"><ErrorState message={error} onRetry={retry} /></div>
  if (!catalog) return <Spinner />
  if (!outfit) return <NotFound />

  const pieces = outfitPieces(outfit, catalog.products)
  const hasAffiliate = pieces.some((p) => p.type === 'affiliate')
  const ours = pieces.filter((p) => p.type !== 'affiliate' && !p.is_sold)

  const addAll = () => {
    const { added, needSize } = addPiecesToBag(ours)
    if (needSize > 0) toast(`Added ${added}. Pick sizes for the other ${needSize} on their pages 💕`)
    else toast(`Added ${added} piece${added === 1 ? '' : 's'} to your bag 💕`)
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pt-6">
      <button onClick={() => (history.length > 1 ? history.back() : navigate('/'))} className="btn btn-ghost btn-sm -ml-2 mb-3">
        <ArrowLeftIcon size={18} /> Back
      </button>
      <div className="grid gap-8 md:grid-cols-[1fr_1.1fr] md:gap-10">
        <div className="rounded-[var(--radius-blob)] bg-white p-2.5 shadow-soft ring-2 ring-petal md:sticky md:top-32 md:self-start">
          <OutfitCollage pieces={pieces} cover={outfit.cover_image_url} />
        </div>
        <div>
          <p className="font-script text-xl text-rose">the look</p>
          <h1 className="text-4xl font-semibold">{outfit.name}</h1>
          {outfit.description && <p className="mt-3 text-ink/85">{outfit.description}</p>}
          {hasAffiliate && <AffiliateNote className="mt-5" />}
          {pieces.length === 0 ? (
            <div className="mt-6"><EmptyState title="Pieces coming soon" /></div>
          ) : (
            <ul className="mt-6 space-y-3">
              {pieces.map((p) => (
                <PieceRow key={p.id} product={p} />
              ))}
            </ul>
          )}
          <div className="mt-6 flex flex-col gap-3 rounded-3xl bg-blush p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-display text-lg">
              Whole look: <strong className="text-rose">{money(outfitTotal(pieces))}</strong>
            </p>
            {ours.length > 0 && (
              <button className="btn btn-primary" onClick={addAll}>
                <BagIcon size={20} /> Add our pieces to bag
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
