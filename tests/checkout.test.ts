import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import { seedProducts } from '../src/data/seed.ts'
import { CartError, checkoutSessionParams, parseCart, priceCart, shippingFor } from '../netlify/lib/pricing.ts'
import { orderFromSession, siteOrigin } from '../netlify/lib/server.ts'
import checkout from '../netlify/functions/checkout.ts'

const cami = seedProducts.find((p) => p.slug === 'satin-bow-cami')!
const hoops = seedProducts.find((p) => p.slug === 'heart-charm-hoops')!
const slip = seedProducts.find((p) => p.slug === 'vintage-lace-slip-dress')!
const flats = seedProducts.find((p) => p.slug === 'butter-yellow-ballet-flats')!

describe('parseCart', () => {
  it('merges duplicate lines', () => {
    const lines = parseCart({ items: [
      { productId: cami.id, quantity: 1, size: 'M' },
      { productId: cami.id, quantity: 2, size: 'M' },
    ] })
    assert.deepEqual(lines, [{ productId: cami.id, quantity: 3, size: 'M' }])
  })
  it('rejects empty, oversized and malformed carts', () => {
    assert.throws(() => parseCart({ items: [] }), CartError)
    assert.throws(() => parseCart({}), CartError)
    assert.throws(() => parseCart({ items: [{ productId: 'nope', quantity: 1 }] }), CartError)
    assert.throws(() => parseCart({ items: [{ productId: cami.id, quantity: 0 }] }), CartError)
    assert.throws(() => parseCart({ items: [{ productId: cami.id, quantity: 1.5 }] }), CartError)
    assert.throws(() => parseCart({ items: Array.from({ length: 11 }, () => ({ productId: cami.id, quantity: 1 })) }), CartError)
  })
})

describe('priceCart', () => {
  it('uses database prices and enforces sizes', () => {
    const priced = priceCart([{ productId: cami.id, quantity: 2, size: 'S' }], seedProducts)
    assert.equal(priced[0].product.price_cents, 2400)
    assert.throws(() => priceCart([{ productId: cami.id, quantity: 1, size: null }], seedProducts), /size/)
    assert.throws(() => priceCart([{ productId: cami.id, quantity: 1, size: 'XXL' }], seedProducts), /size/)
    assert.throws(() => priceCart([{ productId: hoops.id, quantity: 1, size: 'M' }], seedProducts), /sizes/)
  })
  it('caps one-of-one pieces at 1 and refuses sold / affiliate / missing items', () => {
    assert.equal(priceCart([{ productId: slip.id, quantity: 4, size: 'S' }], seedProducts)[0].quantity, 1)
    const sold = { ...slip, is_sold: true }
    assert.throws(() => priceCart([{ productId: slip.id, quantity: 1, size: 'S' }], [sold]), /sold out/)
    assert.throws(() => priceCart([{ productId: flats.id, quantity: 1, size: null }], seedProducts), /another store/)
    assert.throws(() => priceCart([{ productId: cami.id, quantity: 1, size: 'S' }], []), /no longer available/)
    const hidden = { ...cami, is_published: false }
    assert.throws(() => priceCart([{ productId: cami.id, quantity: 1, size: 'S' }], [hidden]), /no longer available/)
  })
})

describe('shipping + Stripe params', () => {
  it('gives free shipping at the threshold', () => {
    assert.equal(shippingFor(7499, 499, 7500), 499)
    assert.equal(shippingFor(7500, 499, 7500), 0)
  })
  it('builds the Stripe form with server prices and metadata', () => {
    const lines = priceCart([{ productId: cami.id, quantity: 2, size: 'M' }], seedProducts)
    const f = checkoutSessionParams({ lines, origin: 'https://shop.example', shippingCents: 499, freeOverCents: 7500 })
    assert.equal(f.get('mode'), 'payment')
    assert.equal(f.get('line_items[0][price_data][unit_amount]'), '2400')
    assert.equal(f.get('line_items[0][quantity]'), '2')
    assert.equal(f.get('line_items[0][price_data][product_data][name]'), 'Satin Bow Cami (Size M)')
    assert.equal(f.get('line_items[0][price_data][product_data][metadata][product_id]'), cami.id)
    assert.equal(f.get('line_items[0][price_data][product_data][images][0]'), null, 'svg images are skipped')
    assert.equal(f.get('shipping_options[0][shipping_rate_data][fixed_amount][amount]'), '499')
    assert.equal(f.get('success_url'), 'https://shop.example/order/success?session_id={CHECKOUT_SESSION_ID}')
  })
})

describe('siteOrigin', () => {
  afterEach(() => {
    delete process.env.URL
  })
  it('ignores spoofed hosts when the site URL is known', () => {
    process.env.URL = 'https://harlea-storefront.netlify.app'
    assert.equal(siteOrigin(new Request('https://evil.example/api/checkout')), 'https://harlea-storefront.netlify.app')
    assert.equal(siteOrigin(new Request('https://harlea-storefront.netlify.app/api/checkout')), 'https://harlea-storefront.netlify.app')
  })
})

describe('orderFromSession', () => {
  it('maps a Stripe session to an order record', () => {
    const order = orderFromSession({
      id: 'cs_test_123', payment_status: 'paid', status: 'complete', amount_total: 5299, currency: 'usd', livemode: false,
      payment_intent: 'pi_1', customer_details: { email: 'a@b.co', name: 'Ava' }, total_details: { amount_shipping: 499 },
      line_items: { data: [{ description: 'Satin Bow Cami (Size M)', quantity: 2, amount_total: 4800,
        price: { unit_amount: 2400, product: { name: 'Satin Bow Cami (Size M)', metadata: { product_id: cami.id, size: 'M', product_type: 'dropship' } } } }] },
    })
    assert.equal(order.amount_shipping_cents, 499)
    assert.deepEqual(order.items[0], { product_id: cami.id, name: 'Satin Bow Cami', size: 'M', unit_price_cents: 2400, quantity: 2, product_type: 'dropship' })
  })
})

describe('checkout function', () => {
  const realFetch = globalThis.fetch
  afterEach(() => {
    globalThis.fetch = realFetch
    delete process.env.STRIPE_SECRET_KEY
  })
  const post = (body: unknown) => new Request('http://localhost:8888/api/checkout', { method: 'POST', body: JSON.stringify(body) })

  it('says "opens soon" when Stripe is not configured', async () => {
    const res = await checkout(post({ items: [] }))
    assert.equal(res.status, 503)
  })
  it('creates a Stripe session and returns its URL', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy'
    let sent = ''
    globalThis.fetch = (async (_url: string, init: RequestInit) => {
      sent = String(init.body)
      return new Response(JSON.stringify({ url: 'https://checkout.stripe.com/c/pay/cs_test_x' }), { status: 200 })
    }) as typeof fetch
    const res = await checkout(post({ items: [{ productId: cami.id, quantity: 1, size: 'S' }] }))
    assert.equal(res.status, 200)
    assert.equal((await res.json()).url, 'https://checkout.stripe.com/c/pay/cs_test_x')
    assert.match(decodeURIComponent(sent), /unit_amount\]=2400/)
  })
  it('rejects a tampered cart with a friendly message', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy'
    const res = await checkout(post({ items: [{ productId: flats.id, quantity: 1, size: null }] }))
    assert.equal(res.status, 400)
    assert.match((await res.json()).error, /another store/)
  })
})
