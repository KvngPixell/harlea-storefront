// Minimal Stripe REST helpers (no SDK needed). Docs: https://docs.stripe.com/api
import { createHmac, timingSafeEqual } from 'node:crypto'

const API = 'https://api.stripe.com/v1'
export const STRIPE_VERSION = '2025-03-31.basil'

export class StripeError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function stripe<T>(secretKey: string, method: 'GET' | 'POST', path: string, form?: URLSearchParams): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Stripe-Version': STRIPE_VERSION,
      ...(form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: form?.toString(),
  })
  const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
  if (!res.ok) throw new StripeError(data.error?.message ?? `Stripe request failed (${res.status})`, res.status)
  return data as T
}

/** Verifies the `Stripe-Signature` header of a webhook (HMAC-SHA256, 5 minute tolerance). */
export function verifyStripeSignature(rawBody: string, header: string | null, secret: string, nowSeconds = Date.now() / 1000, toleranceSeconds = 300): boolean {
  if (!header || !secret) return false
  const parts = header.split(',').map((p) => p.trim().split('='))
  const t = parts.find(([k]) => k === 't')?.[1]
  const sigs = parts.filter(([k]) => k === 'v1').map(([, v]) => v)
  if (!t || sigs.length === 0 || !/^\d+$/.test(t)) return false
  if (Math.abs(nowSeconds - Number(t)) > toleranceSeconds) return false
  const expected = createHmac('sha256', secret).update(`${t}.${rawBody}`, 'utf8').digest()
  return sigs.some((s) => {
    if (!/^[0-9a-f]+$/i.test(s)) return false
    const given = Buffer.from(s, 'hex')
    return given.length === expected.length && timingSafeEqual(given, expected)
  })
}

export interface StripeLineItem {
  description: string | null
  quantity: number
  amount_total: number
  price: { unit_amount: number; product: { name?: string; metadata?: Record<string, string> } | string }
}

export interface StripeSession {
  id: string
  payment_status: 'paid' | 'unpaid' | 'no_payment_required'
  status: string
  amount_total: number | null
  currency: string | null
  livemode: boolean
  payment_intent: string | { id: string } | null
  customer_details?: { email?: string | null; name?: string | null } | null
  total_details?: { amount_shipping?: number | null } | null
  shipping_cost?: { amount_total?: number | null } | null
  shipping_details?: unknown
  collected_information?: { shipping_details?: unknown } | null
  metadata?: Record<string, string> | null
  line_items?: { data: StripeLineItem[] }
}

export function getSessionWithItems(secretKey: string, id: string) {
  return stripe<StripeSession>(
    secretKey,
    'GET',
    `/checkout/sessions/${encodeURIComponent(id)}?expand[]=line_items&expand[]=line_items.data.price.product`,
  )
}
