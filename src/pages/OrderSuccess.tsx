import { useEffect, useState } from 'react'
import { HeartIcon, Sparkle } from '../components/Icons'
import { Spinner } from '../components/ui'
import { bag } from '../lib/bag'
import { money } from '../lib/format'
import { Link, useLocation } from '../lib/router'

interface Confirmation {
  paid: boolean
  email?: string | null
  amount_total_cents?: number
  items?: Array<{ name: string; quantity: number; size?: string | null }>
  recorded?: boolean
}

export default function OrderSuccess() {
  const { search } = useLocation()
  const sessionId = search.get('session_id')
  const [data, setData] = useState<Confirmation | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!sessionId) return
    fetch(`/api/confirm-order?session_id=${encodeURIComponent(sessionId)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: Confirmation) => {
        setData(d)
        if (d.paid) bag.clear()
      })
      .catch(() => setFailed(true))
  }, [sessionId])

  if (sessionId && !data && !failed) return <Spinner label="Confirming your order…" />

  return (
    <div className="mx-auto max-w-lg px-4 pt-14 text-center">
      <div className="card relative overflow-hidden px-6 py-10">
        <Sparkle size={30} color="var(--color-hotpink)" className="absolute left-6 top-6 animate-twinkle" />
        <Sparkle size={20} color="var(--color-bubblegum)" className="absolute bottom-8 right-8 animate-twinkle [animation-delay:-1s]" />
        <HeartIcon size={52} className="mx-auto text-rose" />
        {data?.paid ? (
          <>
            <h1 className="mt-3 text-4xl font-semibold">Yay, it’s yours!</h1>
            <p className="mt-2 text-muted">
              Thank you for your order{data.email ? `. A receipt is on its way to ${data.email}` : ''}.
            </p>
            {data.items && data.items.length > 0 && (
              <ul className="mt-5 space-y-1 text-left">
                {data.items.map((it, i) => (
                  <li key={i} className="flex justify-between rounded-2xl bg-blush px-4 py-2">
                    <span>{it.name}{it.size ? ` (${it.size})` : ''}</span>
                    <span>×{it.quantity}</span>
                  </li>
                ))}
              </ul>
            )}
            {data.amount_total_cents !== undefined && (
              <p className="mt-4 font-display text-lg">Total paid: <strong className="text-rose">{money(data.amount_total_cents)}</strong></p>
            )}
          </>
        ) : (
          <>
            <h1 className="mt-3 text-3xl font-semibold">Thanks for stopping by!</h1>
            <p className="mt-2 text-muted">
              {failed
                ? 'We couldn’t confirm this order just now. If you were charged, you’ll get an email receipt from Stripe. Questions? Contact us.'
                : 'We didn’t find a completed payment for this checkout.'}
            </p>
          </>
        )}
        <Link to="/" className="btn btn-primary mt-7">Keep shopping</Link>
      </div>
    </div>
  )
}
