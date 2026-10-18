import { useEffect, useState, type ReactNode } from 'react'
import { cx, money } from '../lib/format'
import { Link } from '../lib/router'
import type { Product } from '../types'
import { HeartIcon, Sparkle } from './Icons'

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" className="flex flex-col items-center justify-center gap-3 py-16 text-muted">
      <Sparkle size={34} color="var(--color-hotpink)" className="animate-twinkle" />
      <span className="font-display">{label}</span>
    </div>
  )
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="card mx-auto max-w-md px-6 py-10 text-center">
      <HeartIcon size={36} className="mx-auto mb-3 text-bubblegum" />
      <h2 className="text-xl font-semibold">{title}</h2>
      {children && <div className="mt-2 text-muted">{children}</div>}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="card mx-auto max-w-md border-rose/40 px-6 py-8 text-center">
      <p className="font-display text-lg">Oops! 💔</p>
      <p className="mt-1 text-muted">{message}</p>
      {onRetry && (
        <button className="btn btn-soft btn-sm mt-4" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}

export function Price({ product, className }: { product: Pick<Product, 'price_cents' | 'compare_at_cents'>; className?: string }) {
  const onSale = product.compare_at_cents !== null && product.compare_at_cents > product.price_cents
  return (
    <span className={cx('font-display font-semibold', className)}>
      {money(product.price_cents)}
      {onSale && (
        <>
          <span className="sr-only">, was </span>
          <s className="ml-2 text-sm font-normal text-muted">{money(product.compare_at_cents)}</s>
        </>
      )}
    </span>
  )
}

export function ProductBadges({ product }: { product: Product }) {
  const onSale = product.compare_at_cents !== null && product.compare_at_cents > product.price_cents
  return (
    <div className="flex flex-wrap gap-1.5">
      {product.is_sold && <span className="chip bg-ink text-white">SOLD</span>}
      {!product.is_sold && product.type === 'unique' && <span className="chip bg-butter text-ink">one of one ✦</span>}
      {onSale && !product.is_sold && <span className="chip bg-rose text-white">sale</span>}
      {product.type === 'affiliate' && <span className="chip bg-lilac text-lilac-deep">shop at {product.store_name ?? 'partner'}</span>}
    </div>
  )
}

/** Required on any page that shows affiliate links (FTC). */
export function AffiliateNote({ className }: { className?: string }) {
  return (
    <p className={cx('rounded-2xl bg-lilac/60 px-4 py-3 text-sm text-lilac-deep', className)}>
      <strong className="font-display">Heads up:</strong> some links here are affiliate links. If you buy through them we
      may earn a small commission at no extra cost to you.{' '}
      <Link to="/info/disclosure" className="underline underline-offset-2">
        Learn more
      </Link>
    </p>
  )
}

export function ProductImg({ product, className, sizes }: { product: Product; className?: string; sizes?: string }) {
  const img = product.product_images?.[0]
  const [broken, setBroken] = useState(false)
  if (!img || broken) {
    return (
      <div className={cx('flex items-center justify-center bg-blush text-bubblegum', className)} aria-label={product.name} role="img">
        <HeartIcon size={48} />
      </div>
    )
  }
  return (
    <img
      src={img.url}
      alt={img.alt || product.name}
      loading="lazy"
      decoding="async"
      sizes={sizes}
      onError={() => setBroken(true)}
      className={cx('object-cover', className)}
    />
  )
}

/** Small pop-up message at the bottom of the screen. */
let pushToast: ((msg: string) => void) | null = null
export function toast(message: string) {
  pushToast?.(message)
}
export function Toaster() {
  const [items, setItems] = useState<Array<{ id: number; message: string }>>([])
  useEffect(() => {
    pushToast = (message) => {
      const id = Date.now() + Math.random()
      setItems((xs) => [...xs, { id, message }])
      setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 3200)
    }
    return () => {
      pushToast = null
    }
  }, [])
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
      {items.map((t) => (
        <div key={t.id} className="animate-pop-in rounded-full bg-ink px-5 py-3 font-display text-sm text-white shadow-lg">
          {t.message}
        </div>
      ))}
    </div>
  )
}

export function SectionTitle({ kicker, title, children }: { kicker?: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-6 text-center">
      {kicker && <p className="font-script text-xl text-rose">{kicker}</p>}
      <h2 className="text-3xl font-semibold sm:text-4xl">{title}</h2>
      {children && <p className="mx-auto mt-2 max-w-xl text-muted">{children}</p>}
    </div>
  )
}
