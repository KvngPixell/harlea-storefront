// Server-side helpers shared by the Netlify Functions.
import { seedProducts } from '../../src/data/seed'
import type { Product } from '../../src/types'
import type { StripeSession } from './stripe'

export const env = (key: string): string => (process.env[key] ?? '').trim()

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

const supabaseUrl = () => env('SUPABASE_URL').replace(/\/$/, '')
const supabaseKey = () => env('SUPABASE_ANON_KEY')
export const hasDatabase = () => Boolean(supabaseUrl() && supabaseKey())

/** Loads published products by id: from the database, or the demo catalog if none is connected. */
export async function loadProducts(ids: string[]): Promise<Product[]> {
  if (!hasDatabase()) return seedProducts.filter((p) => ids.includes(p.id))
  const res = await fetch(
    `${supabaseUrl()}/rest/v1/products?select=*,product_images(url,sort_order)&is_published=eq.true&id=in.(${ids.join(',')})&product_images.order=sort_order.asc`,
    { headers: { apikey: supabaseKey() } },
  )
  if (!res.ok) throw new Error(`product lookup failed (${res.status})`)
  return (await res.json()) as Product[]
}

/** Picks a safe site address for Stripe's return links (never trusts an unknown Host header). */
export function siteOrigin(req: Request): string {
  const reqOrigin = new URL(req.url).origin
  const allowed = [env('URL'), env('DEPLOY_PRIME_URL'), env('DEPLOY_URL')].filter(Boolean).map((u) => new URL(u).origin)
  if (allowed.includes(reqOrigin)) return reqOrigin
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(reqOrigin) && !env('URL')) return reqOrigin
  return allowed[0] ?? reqOrigin
}

/** Turns a paid Stripe session into the order record our database expects. */
export function orderFromSession(s: StripeSession) {
  const items = (s.line_items?.data ?? []).map((li) => {
    const product = typeof li.price.product === 'object' ? li.price.product : { name: undefined, metadata: {} }
    const meta = product.metadata ?? {}
    return {
      product_id: meta.product_id ?? '',
      name: (product.name ?? li.description ?? 'Item').replace(/ \(Size [^)]+\)$/, ''),
      size: meta.size ?? null,
      unit_price_cents: li.price.unit_amount,
      quantity: li.quantity,
      product_type: meta.product_type ?? null,
    }
  })
  return {
    stripe_session_id: s.id,
    stripe_payment_intent: typeof s.payment_intent === 'string' ? s.payment_intent : s.payment_intent?.id ?? null,
    email: s.customer_details?.email ?? null,
    customer_name: s.customer_details?.name ?? null,
    amount_total_cents: s.amount_total ?? 0,
    amount_shipping_cents: s.total_details?.amount_shipping ?? s.shipping_cost?.amount_total ?? 0,
    currency: s.currency ?? 'usd',
    livemode: s.livemode,
    shipping: s.collected_information?.shipping_details ?? s.shipping_details ?? null,
    items,
  }
}

/** Saves a paid order in the database (safe to call more than once). Returns false if not configured. */
export async function recordOrder(s: StripeSession): Promise<boolean> {
  const secret = env('ORDER_RPC_SECRET')
  if (!hasDatabase() || !secret || s.payment_status !== 'paid') return false
  const res = await fetch(`${supabaseUrl()}/rest/v1/rpc/record_paid_order`, {
    method: 'POST',
    headers: { apikey: supabaseKey(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_secret: secret, p_order: orderFromSession(s) }),
  })
  if (!res.ok) throw new Error(`recording order failed (${res.status})`)
  return true
}
