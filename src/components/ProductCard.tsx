import { cx } from '../lib/format'
import { Link } from '../lib/router'
import type { Product } from '../types'
import { Price, ProductBadges, ProductImg } from './ui'

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const tilt = index % 3 === 0 ? 'hover:-rotate-1' : index % 3 === 1 ? 'hover:rotate-1' : 'hover:-rotate-[0.5deg]'
  return (
    <Link
      to={`/p/${product.slug}`}
      className={cx(
        'group block rounded-[var(--radius-blob)] bg-white p-2.5 shadow-soft ring-2 ring-petal transition duration-200',
        'hover:-translate-y-1 hover:shadow-pop hover:ring-bubblegum',
        tilt,
      )}
    >
      <div className="relative overflow-hidden rounded-[1.35rem]">
        <ProductImg
          product={product}
          sizes="(min-width: 1024px) 25vw, 50vw"
          className={cx('aspect-[4/5] w-full transition duration-300 group-hover:scale-[1.03]', product.is_sold && 'opacity-60 grayscale-[40%]')}
        />
        <div className="absolute left-2 top-2">
          <ProductBadges product={product} />
        </div>
      </div>
      <div className="px-1.5 pb-1 pt-3">
        <h3 className="line-clamp-2 font-display text-[1.02rem] font-medium leading-snug">{product.name}</h3>
        <Price product={product} className="mt-1 block text-rose" />
      </div>
    </Link>
  )
}

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
      {products.map((p, i) => (
        <li key={p.id} className="animate-pop-in" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
          <ProductCard product={p} index={i} />
        </li>
      ))}
    </ul>
  )
}
