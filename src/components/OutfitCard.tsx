import { hidesPrice } from '../lib/amazon'
import { money } from '../lib/format'
import { Link } from '../lib/router'
import type { Outfit, Product } from '../types'
import { ProductImg } from './ui'

export function outfitPieces(outfit: Outfit, products: Product[]): Product[] {
  const byId = new Map(products.map((p) => [p.id, p]))
  return (outfit.outfit_items ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((it) => byId.get(it.product_id))
    .filter((p): p is Product => Boolean(p))
}

/** Total of the pieces whose price we can show (Amazon prices can't be shown on our site). */
export function outfitTotal(pieces: Product[]): number {
  return pieces.filter((p) => !hidesPrice(p)).reduce((sum, p) => sum + p.price_cents, 0)
}

export function hasHiddenPrices(pieces: Product[]): boolean {
  return pieces.some((p) => hidesPrice(p))
}

export function OutfitCollage({ pieces, cover }: { pieces: Product[]; cover?: string | null }) {
  if (cover) return <img src={cover} alt="" className="aspect-square w-full rounded-[1.35rem] object-cover" loading="lazy" />
  const four = pieces.slice(0, 4)
  return (
    <div className="grid aspect-square grid-cols-2 gap-1.5 overflow-hidden rounded-[1.35rem] bg-blush">
      {four.map((p, i) => (
        <ProductImg key={p.id} product={p} className={four.length === 3 && i === 0 ? 'row-span-2 h-full w-full' : 'h-full w-full'} />
      ))}
    </div>
  )
}

export function OutfitCard({ outfit, products }: { outfit: Outfit; products: Product[] }) {
  const pieces = outfitPieces(outfit, products)
  return (
    <Link
      to={`/looks/${outfit.slug}`}
      className="group block rounded-[var(--radius-blob)] bg-white p-2.5 shadow-soft ring-2 ring-petal transition hover:-translate-y-1 hover:shadow-pop hover:ring-bubblegum"
    >
      <OutfitCollage pieces={pieces} cover={outfit.cover_image_url} />
      <div className="flex items-end justify-between gap-2 px-1.5 pb-1 pt-3">
        <div>
          <h3 className="font-display text-lg font-semibold leading-tight">{outfit.name}</h3>
          <p className="text-sm text-muted">{pieces.length} pieces</p>
        </div>
        <span className="chip bg-blush text-rose">{money(outfitTotal(pieces))}{hasHiddenPrices(pieces) ? '+' : ''}</span>
      </div>
    </Link>
  )
}
