// POST /api/stripe-webhook  (optional, recommended)
// Stripe calls this when a checkout completes, so orders are saved even if the
// shopper closes the tab before the "thank you" page loads.
import { env, json, recordOrder } from '../lib/server'
import { getSessionWithItems, verifyStripeSignature } from '../lib/stripe'

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  const secret = env('STRIPE_WEBHOOK_SECRET')
  const key = env('STRIPE_SECRET_KEY')
  if (!secret || !key) return json({ error: 'Webhook not configured' }, 503)

  const raw = await req.text()
  if (!verifyStripeSignature(raw, req.headers.get('stripe-signature'), secret)) {
    return json({ error: 'Bad signature' }, 400)
  }

  const event = JSON.parse(raw) as { type: string; data: { object: { id: string } } }
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    try {
      const s = await getSessionWithItems(key, event.data.object.id)
      await recordOrder(s)
    } catch (e) {
      console.error('webhook order recording failed:', e)
      return json({ error: 'Temporary failure' }, 500) // Stripe will retry
    }
  }
  return json({ received: true })
}

export const config = { path: '/api/stripe-webhook' }
