// GET /api/confirm-order?session_id=cs_...
// Called by the "thank you" page. Confirms payment with Stripe and records the order
// (so orders are saved even before a Stripe webhook is set up).
import { env, json, recordOrder } from '../lib/server'
import { getSessionWithItems } from '../lib/stripe'

export default async (req: Request): Promise<Response> => {
  const id = new URL(req.url).searchParams.get('session_id') ?? ''
  if (!/^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(id)) return json({ error: 'Invalid session' }, 400)
  const key = env('STRIPE_SECRET_KEY')
  if (!key) return json({ error: 'Checkout not configured' }, 503)

  try {
    const s = await getSessionWithItems(key, id)
    const paid = s.payment_status === 'paid'
    let recorded = false
    if (paid) {
      try {
        recorded = await recordOrder(s)
      } catch (e) {
        console.error('order recording failed:', e)
      }
    }
    return json({
      paid,
      recorded,
      email: paid ? s.customer_details?.email ?? null : null,
      amount_total_cents: paid ? s.amount_total ?? 0 : undefined,
      items: paid
        ? (s.line_items?.data ?? []).map((li) => {
            const product = typeof li.price.product === 'object' ? li.price.product : null
            return {
              name: (product?.name ?? li.description ?? 'Item').replace(/ \(Size [^)]+\)$/, ''),
              size: product?.metadata?.size ?? null,
              quantity: li.quantity,
            }
          })
        : [],
    })
  } catch (e) {
    console.error('confirm-order failed:', e)
    return json({ error: 'Could not confirm order' }, 502)
  }
}

export const config = { path: '/api/confirm-order' }
