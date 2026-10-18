import { useState } from 'react'
import { BagIcon, MinusIcon, PlusIcon, TrashIcon } from '../components/Icons'
import { EmptyState, ErrorState, ProductImg, Spinner } from '../components/ui'
import { bag, useBag } from '../lib/bag'
import { startCheckout } from '../lib/checkout'
import { money } from '../lib/format'
import { Link } from '../lib/router'
import { useCatalog } from '../lib/useCatalog'

// Keep in sync with the server defaults in netlify/functions/_shared/pricing.ts
export const SHIPPING_CENTS = 499
export const FREE_SHIPPING_OVER_CENTS = 7500

export default function BagPage() {
  const { catalog, error, retry } = useCatalog()
  const lines = useBag()
  const [busy, setBusy] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  if (error) return <div className="px-4 py-16"><ErrorState message={error} onRetry={retry} /></div>
  if (!catalog) return <Spinner />

  const rows = lines.map((l) => ({ line: l, product: catalog.products.find((p) => p.id === l.productId) }))
  const ok = rows.filter((r) => r.product && !r.product.is_sold && r.product.type !== 'affiliate')
  const gone = rows.filter((r) => !ok.includes(r))
  const subtotal = ok.reduce((s, r) => s + r.product!.price_cents * r.line.quantity, 0)
  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_OVER_CENTS ? 0 : SHIPPING_CENTS

  const checkout = async () => {
    setBusy(true)
    setCheckoutError(null)
    const err = await startCheckout(ok.map((r) => r.line))
    if (err) {
      setCheckoutError(err)
      setBusy(false)
    }
  }

  if (lines.length === 0) {
    return (
      <div className="px-4 py-16">
        <EmptyState title="Your bag is empty">
          <p>Let’s fix that!</p>
          <Link to="/" className="btn btn-primary mt-5">Start shopping</Link>
        </EmptyState>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 pt-10">
      <h1 className="mb-6 flex items-center gap-3 text-4xl font-semibold">
        <BagIcon size={34} className="text-rose" /> Your bag
      </h1>
      <div className="grid gap-6 md:grid-cols-[1fr_300px]">
        <ul className="space-y-3">
          {ok.map(({ line, product: p }) => (
            <li key={`${line.productId}-${line.size}`} className="flex gap-3 rounded-3xl bg-white p-3 ring-2 ring-petal">
              <Link to={`/p/${p!.slug}`} className="shrink-0">
                <ProductImg product={p!} className="h-28 w-22 rounded-2xl" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <Link to={`/p/${p!.slug}`} className="truncate font-display text-lg font-medium hover:text-rose">{p!.name}</Link>
                {line.size && <span className="text-sm text-muted">Size {line.size}</span>}
                <span className="font-display font-semibold text-rose">{money(p!.price_cents * line.quantity)}</span>
                <div className="mt-auto flex items-center justify-between pt-2">
                  {p!.type === 'unique' ? (
                    <span className="text-sm text-muted">one of one</span>
                  ) : (
                    <div className="inline-flex items-center rounded-full border-2 border-petal">
                      <button className="grid h-10 w-10 place-items-center" aria-label="Less" onClick={() => bag.setQuantity(line.productId, line.size, line.quantity - 1)}>
                        <MinusIcon size={16} />
                      </button>
                      <span className="w-6 text-center font-display">{line.quantity}</span>
                      <button className="grid h-10 w-10 place-items-center" aria-label="More" onClick={() => bag.setQuantity(line.productId, line.size, line.quantity + 1)}>
                        <PlusIcon size={16} />
                      </button>
                    </div>
                  )}
                  <button className="btn btn-ghost btn-sm" onClick={() => bag.remove(line.productId, line.size)} aria-label={`Remove ${p!.name}`}>
                    <TrashIcon size={18} />
                  </button>
                </div>
              </div>
            </li>
          ))}
          {gone.length > 0 && (
            <li className="rounded-3xl bg-blush p-4 text-sm">
              {gone.length} item{gone.length > 1 ? 's are' : ' is'} no longer available and won’t be included.{' '}
              <button className="font-semibold text-rose underline" onClick={() => gone.forEach((g) => bag.remove(g.line.productId, g.line.size))}>
                Remove
              </button>
            </li>
          )}
        </ul>

        <aside className="card h-fit p-5 md:sticky md:top-32">
          <dl className="space-y-2">
            <div className="flex justify-between"><dt>Subtotal</dt><dd className="font-display font-semibold">{money(subtotal)}</dd></div>
            <div className="flex justify-between"><dt>Shipping</dt><dd className="font-display font-semibold">{shipping === 0 ? 'FREE' : money(shipping)}</dd></div>
            <div className="flex justify-between border-t-2 border-petal pt-2 text-lg"><dt className="font-display">Total</dt><dd className="font-display font-bold text-rose">{money(subtotal + shipping)}</dd></div>
          </dl>
          {shipping > 0 && (
            <p className="mt-3 rounded-2xl bg-butter/60 px-3 py-2 text-sm">
              Add {money(FREE_SHIPPING_OVER_CENTS - subtotal)} more for free shipping ✦
            </p>
          )}
          <button className="btn btn-primary mt-4 w-full text-lg" onClick={checkout} disabled={busy || ok.length === 0}>
            {busy ? 'Opening checkout…' : 'Checkout'}
          </button>
          {checkoutError && <p role="alert" className="mt-3 text-sm text-rose">{checkoutError}</p>}
          <p className="mt-3 text-center text-xs text-muted">Secure checkout by Stripe. Taxes calculated at checkout if applicable.</p>
        </aside>
      </div>
    </div>
  )
}
