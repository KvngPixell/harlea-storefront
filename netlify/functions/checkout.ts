// POST /api/checkout  { items: [{ productId, quantity, size }] }  ->  { url }
// Prices always come from our database, never from the browser.
import { CartError, checkoutSessionParams, parseCart, priceCart } from '../lib/pricing'
import { env, hasDatabase, json, loadProducts, siteOrigin } from '../lib/server'
import { stripe, StripeError } from '../lib/stripe'

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const key = env('STRIPE_SECRET_KEY')
  if (!key) return json({ error: 'Checkout opens soon! 💕 We’re putting the finishing touches on it.' }, 503)
  if (key.startsWith('sk_live') && !hasDatabase()) {
    return json({ error: 'Checkout is paused while we finish setting up.' }, 503)
  }

  try {
    const body = await req.json().catch(() => null)
    const lines = parseCart(body)
    const products = await loadProducts([...new Set(lines.map((l) => l.productId))])
    const priced = priceCart(lines, products)
    const form = checkoutSessionParams({
      lines: priced,
      origin: siteOrigin(req),
      shippingCents: Number(env('SHIPPING_CENTS') || 499),
      freeOverCents: Number(env('FREE_SHIPPING_OVER_CENTS') || 7500),
    })
    const session = await stripe<{ url: string }>(key, 'POST', '/checkout/sessions', form)
    return json({ url: session.url })
  } catch (err) {
    if (err instanceof CartError) return json({ error: err.message }, 400)
    console.error('checkout failed:', err instanceof StripeError ? `${err.status} ${err.message}` : err)
    return json({ error: 'Checkout hit a snag. Please try again in a moment.' }, 502)
  }
}

export const config = { path: '/api/checkout' }
