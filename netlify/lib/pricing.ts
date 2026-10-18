// Pure checkout logic (no network) so it can be unit-tested.
import type { CartLine, Product } from '../../src/types'

export const MAX_LINES = 10
export const MAX_QTY = 10

export interface PricedLine {
  product: Product
  size: string | null
  quantity: number
}

export class CartError extends Error {
  status = 400
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Checks the raw request body and returns clean cart lines (duplicates merged). */
export function parseCart(body: unknown): CartLine[] {
  const items = (body as { items?: unknown })?.items
  if (!Array.isArray(items) || items.length === 0) throw new CartError('Your bag is empty.')
  if (items.length > MAX_LINES) throw new CartError(`Please check out ${MAX_LINES} items or fewer at a time.`)
  const merged = new Map<string, CartLine>()
  for (const raw of items) {
    const it = raw as Partial<CartLine>
    if (typeof it.productId !== 'string' || !UUID.test(it.productId)) throw new CartError('Something in your bag isn’t valid.')
    const quantity = Number(it.quantity)
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY) throw new CartError('Please choose a quantity from 1 to 10.')
    const size = it.size === null || it.size === undefined || it.size === '' ? null : String(it.size).slice(0, 20)
    const key = `${it.productId}|${size ?? ''}`
    const prev = merged.get(key)
    merged.set(key, { productId: it.productId, size, quantity: Math.min(MAX_QTY, (prev?.quantity ?? 0) + quantity) })
  }
  return [...merged.values()]
}

/** Matches cart lines to real products from the database and enforces the rules. */
export function priceCart(lines: CartLine[], products: Product[]): PricedLine[] {
  const byId = new Map(products.map((p) => [p.id, p]))
  const uniqueQty = new Map<string, number>()
  return lines.map((line) => {
    const product = byId.get(line.productId)
    if (!product || !product.is_published) throw new CartError('One of the items in your bag is no longer available.')
    if (product.is_sold) throw new CartError(`Sorry, “${product.name}” just sold out.`)
    if (product.type === 'affiliate') throw new CartError(`“${product.name}” is sold by another store. Use its “Buy at” button.`)
    if (product.sizes.length > 0) {
      if (!line.size || !product.sizes.includes(line.size)) throw new CartError(`Please choose a size for “${product.name}”.`)
    } else if (line.size) {
      throw new CartError(`“${product.name}” doesn’t come in sizes.`)
    }
    let quantity = line.quantity
    if (product.type === 'unique') {
      const already = uniqueQty.get(product.id) ?? 0
      if (already >= 1) throw new CartError(`“${product.name}” is one of a kind, so you can only buy one.`)
      quantity = 1
      uniqueQty.set(product.id, 1)
    }
    return { product, size: line.size, quantity }
  })
}

export function shippingFor(subtotalCents: number, flatCents: number, freeOverCents: number): number {
  return subtotalCents >= freeOverCents ? 0 : flatCents
}

/** Builds the form fields for Stripe's "create Checkout Session" API. */
export function checkoutSessionParams(opts: {
  lines: PricedLine[]
  origin: string
  shippingCents: number
  freeOverCents: number
}): URLSearchParams {
  const { lines, origin } = opts
  const f = new URLSearchParams()
  f.set('mode', 'payment')
  f.set('success_url', `${origin}/order/success?session_id={CHECKOUT_SESSION_ID}`)
  f.set('cancel_url', `${origin}/bag`)
  f.set('shipping_address_collection[allowed_countries][0]', 'US')
  f.set('billing_address_collection', 'auto')
  f.set('metadata[source]', 'harlea-storefront')

  let subtotal = 0
  lines.forEach((l, i) => {
    const p = `line_items[${i}]`
    subtotal += l.product.price_cents * l.quantity
    f.set(`${p}[quantity]`, String(l.quantity))
    f.set(`${p}[price_data][currency]`, 'usd')
    f.set(`${p}[price_data][unit_amount]`, String(l.product.price_cents))
    f.set(`${p}[price_data][product_data][name]`, l.size ? `${l.product.name} (Size ${l.size})` : l.product.name)
    const img = l.product.product_images?.[0]?.url
    const abs = img ? new URL(img, origin).toString() : null
    // Stripe can only show PNG/JPG/WebP images from public https URLs.
    if (abs && abs.startsWith('https://') && !abs.endsWith('.svg') && !abs.startsWith('data:')) {
      f.set(`${p}[price_data][product_data][images][0]`, abs)
    }
    f.set(`${p}[price_data][product_data][metadata][product_id]`, l.product.id)
    f.set(`${p}[price_data][product_data][metadata][product_type]`, l.product.type)
    if (l.size) f.set(`${p}[price_data][product_data][metadata][size]`, l.size)
  })

  const ship = shippingFor(subtotal, opts.shippingCents, opts.freeOverCents)
  f.set('shipping_options[0][shipping_rate_data][type]', 'fixed_amount')
  f.set('shipping_options[0][shipping_rate_data][display_name]', ship === 0 ? 'Free shipping' : 'Standard shipping')
  f.set('shipping_options[0][shipping_rate_data][fixed_amount][amount]', String(ship))
  f.set('shipping_options[0][shipping_rate_data][fixed_amount][currency]', 'usd')
  return f
}
