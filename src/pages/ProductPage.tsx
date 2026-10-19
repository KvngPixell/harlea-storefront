import { useEffect, useState } from 'react'
import { ArrowLeftIcon, BagIcon, ExternalIcon, MinusIcon, PlusIcon } from '../components/Icons'
import { OutfitCard } from '../components/OutfitCard'
import { ProductGrid } from '../components/ProductCard'
import { AffiliateNote, ErrorState, Price, ProductBadges, Spinner, toast } from '../components/ui'
import { AffiliateLink } from '../lib/affiliate'
import { bag, MAX_QTY } from '../lib/bag'
import { startCheckout } from '../lib/checkout'
import { cx, money } from '../lib/format'
import { Link, navigate } from '../lib/router'
import { useCatalog } from '../lib/useCatalog'
import NotFound from './NotFound'

export default function ProductPage({ slug }: { slug: string }) {
  const { catalog, error, retry } = useCatalog()
  const [active, setActive] = useState(0)
  const [size, setSize] = useState<string | null>(null)
  const [qty, setQty] = useState(1)
  const [sizeError, setSizeError] = useState(false)
  const [busy, setBusy] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  const product = catalog?.products.find((p) => p.slug === slug)

  useEffect(() => {
    setActive(0)
    setSize(product?.sizes.length === 1 ? product.sizes[0] : null)
    setQty(1)
    setSizeError(false)
    setCheckoutError(null)
  }, [product?.id, product?.sizes])

  useEffect(() => {
    if (!product) return
    document.title = `${product.name} · ${catalog?.settings.brand_name ?? ''}`
    if (product.type === 'affiliate') return
    // Product details Google can read (helps free Google Shopping listings).
    const el = document.createElement('script')
    el.type = 'application/ld+json'
    el.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: product.description,
      image: (product.product_images ?? []).map((i) => new URL(i.url, location.origin).toString()),
      sku: product.id,
      brand: { '@type': 'Brand', name: product.brand || catalog?.settings.brand_name || '96.co' },
      itemCondition: product.condition === 'used' ? 'https://schema.org/UsedCondition' : 'https://schema.org/NewCondition',
      offers: {
        '@type': 'Offer',
        price: (product.price_cents / 100).toFixed(2),
        priceCurrency: 'USD',
        availability: product.is_sold ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
        url: location.href,
      },
    })
    document.head.appendChild(el)
    return () => el.remove()
  }, [product, catalog?.settings.brand_name])

  if (error) return <div className="px-4 py-16"><ErrorState message={error} onRetry={retry} /></div>
  if (!catalog) return <Spinner />
  if (!product) return <NotFound />

  const images = product.product_images ?? []
  const tab = catalog.tabs.find((t) => t.id === product.tab_id)
  const isAffiliate = product.type === 'affiliate'
  const maxQty = product.type === 'unique' ? 1 : MAX_QTY
  const needsSize = product.sizes.length > 0
  const looks = catalog.outfits.filter((o) => o.outfit_items?.some((it) => it.product_id === product.id))
  const related = catalog.products
    .filter((p) => p.id !== product.id && p.tab_id && p.tab_id === product.tab_id && !p.is_sold)
    .slice(0, 4)

  const ensureSize = () => {
    if (needsSize && !size) {
      setSizeError(true)
      document.getElementById('size-picker')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return false
    }
    return true
  }

  const addToBag = () => {
    if (!ensureSize()) return
    const res = bag.add(product.id, size, qty, maxQty)
    toast(res.ok ? `Added to your bag 💕` : res.message ?? 'Couldn’t add that')
  }

  const buyNow = async () => {
    if (!ensureSize()) return
    setBusy(true)
    setCheckoutError(null)
    const err = await startCheckout([{ productId: product.id, size, quantity: qty }])
    if (err) {
      setCheckoutError(err)
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6">
      <button onClick={() => (history.length > 1 ? history.back() : navigate('/'))} className="btn btn-ghost btn-sm -ml-2 mb-3">
        <ArrowLeftIcon size={18} /> Back
      </button>

      <div className="grid gap-8 md:grid-cols-2 md:gap-12">
        {/* Gallery */}
        <div>
          <div className="relative overflow-hidden rounded-[var(--radius-blob)] bg-white p-2.5 shadow-soft ring-2 ring-petal">
            {images.length > 0 ? (
              <img
                src={images[active]?.url}
                alt={images[active]?.alt || product.name}
                className={cx('aspect-[4/5] w-full rounded-[1.35rem] object-cover', product.is_sold && 'opacity-70')}
              />
            ) : (
              <div className="aspect-[4/5] w-full rounded-[1.35rem] bg-blush" />
            )}
            <div className="absolute left-5 top-5">
              <ProductBadges product={product} />
            </div>
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setActive(i)}
                  aria-label={`Show photo ${i + 1}`}
                  aria-current={i === active}
                  className={cx('shrink-0 overflow-hidden rounded-2xl ring-2 transition', i === active ? 'ring-rose' : 'ring-petal opacity-70 hover:opacity-100')}
                >
                  <img src={img.url} alt="" className="h-20 w-16 object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="md:pt-4">
          {tab && (
            <Link to={`/shop/${tab.slug}`} className="chip bg-blush text-rose hover:bg-petal">
              {tab.name}
            </Link>
          )}
          <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">{product.name}</h1>
          <Price product={product} className="mt-2 block text-2xl text-rose" />

          {needsSize && !isAffiliate && !product.is_sold && (
            <fieldset id="size-picker" className="mt-6">
              <legend className="label">
                Size {sizeError && <span className="ml-2 text-sm font-normal text-rose">← please pick a size</span>}
              </legend>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={size === s}
                    onClick={() => {
                      setSize(s)
                      setSizeError(false)
                    }}
                    className={cx(
                      'h-12 min-w-12 rounded-2xl border-2 px-4 font-display font-semibold transition',
                      size === s ? 'border-rose bg-rose text-white' : 'border-petal bg-white hover:border-bubblegum',
                      sizeError && 'border-rose/70',
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {!isAffiliate && !product.is_sold && maxQty > 1 && (
            <div className="mt-5">
              <span className="label">Quantity</span>
              <div className="inline-flex items-center rounded-full border-2 border-petal bg-white">
                <button className="grid h-12 w-12 place-items-center" aria-label="Less" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                  <MinusIcon size={18} />
                </button>
                <span className="w-8 text-center font-display text-lg" aria-live="polite">{qty}</span>
                <button className="grid h-12 w-12 place-items-center" aria-label="More" onClick={() => setQty((q) => Math.min(maxQty, q + 1))}>
                  <PlusIcon size={18} />
                </button>
              </div>
            </div>
          )}

          <div className="mt-7 flex flex-col gap-3">
            {product.is_sold ? (
              <p className="rounded-2xl bg-blush px-5 py-4 font-display text-lg">
                Sold! This one found a new home 💕
              </p>
            ) : isAffiliate ? (
              <>
                <AffiliateLink product={product} source="product" className="btn btn-primary text-lg">
                  Buy at {product.store_name ?? 'partner store'} <ExternalIcon size={18} />
                </AffiliateLink>
                <AffiliateNote />
              </>
            ) : (
              <>
                <button className="btn btn-primary text-lg" onClick={addToBag}>
                  <BagIcon size={20} /> Add to bag
                </button>
                <button className="btn btn-soft" onClick={buyNow} disabled={busy}>
                  {busy ? 'Opening checkout…' : `Buy now · ${money(product.price_cents * qty)}`}
                </button>
                {checkoutError && <p role="alert" className="text-sm text-rose">{checkoutError}</p>}
              </>
            )}
          </div>

          {product.description && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold">The details</h2>
              <p className="mt-2 whitespace-pre-line leading-relaxed text-ink/85">{product.description}</p>
            </div>
          )}
          {!isAffiliate && (
            <p className="mt-6 rounded-2xl bg-white px-4 py-3 text-sm text-muted ring-2 ring-petal">
              {product.type === 'unique' ? 'One-of-one piece, ships from us. ' : 'Ships from our partner. '}
              <Link to="/info/shipping" className="text-rose underline">Shipping</Link> ·{' '}
              <Link to="/info/returns" className="text-rose underline">Returns</Link>
            </p>
          )}
        </div>
      </div>

      {looks.length > 0 && (
        <section className="pt-16">
          <h2 className="mb-5 text-center text-3xl font-semibold">Complete the look</h2>
          <ul className={looks.length === 1 ? 'mx-auto grid max-w-sm' : 'grid gap-5 sm:grid-cols-2 lg:grid-cols-3'}>
            {looks.slice(0, 3).map((o) => (
              <li key={o.id}>
                <OutfitCard outfit={o} products={catalog.products} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {related.length > 0 && (
        <section className="pt-16">
          <h2 className="mb-5 text-center text-3xl font-semibold">You might also love</h2>
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  )
}
