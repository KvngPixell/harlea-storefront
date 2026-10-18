import type { CartLine } from '../types'

/** Asks our server for a Stripe Checkout page and sends the shopper there. */
export async function startCheckout(lines: CartLine[]): Promise<string | null> {
  try {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: lines }),
    })
    const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string }
    if (res.ok && data.url) {
      window.location.assign(data.url)
      return null
    }
    return data.error ?? 'Checkout isn’t available right now. Please try again in a bit.'
  } catch {
    return 'We couldn’t reach checkout. Please check your connection and try again.'
  }
}
