import { useState } from 'react'
import { EmptyState, ErrorState, Spinner, toast } from '../components/ui'
import { cx, money, shortDate } from '../lib/format'
import { store } from '../lib/store'
import type { Order, OrderStatus } from '../types'
import { PageHeader, reportError } from './components'
import { useOrders } from './Overview'

const STATUS: Record<OrderStatus, { label: string; cls: string }> = {
  paid: { label: 'To ship', cls: 'bg-butter text-ink' },
  fulfilled: { label: 'Shipped', cls: 'bg-lilac text-lilac-deep' },
  refunded: { label: 'Refunded', cls: 'bg-blush text-muted' },
  canceled: { label: 'Canceled', cls: 'bg-blush text-muted' },
}

function address(o: Order): string | null {
  const s = o.shipping as { name?: string; address?: Record<string, string | null> } | null
  if (!s?.address) return null
  const a = s.address
  return [s.name, a.line1, a.line2, [a.city, a.state, a.postal_code].filter(Boolean).join(', ')].filter(Boolean).join('\n')
}

export default function Orders() {
  const { orders, error, reload, setOrders } = useOrders()
  const [filter, setFilter] = useState<'all' | 'paid' | 'fulfilled'>('all')
  const [open, setOpen] = useState<string | null>(null)

  const setStatus = async (o: Order, status: OrderStatus) => {
    try {
      await store.setOrderStatus(o.id, status)
      setOrders((list) => list?.map((x) => (x.id === o.id ? { ...x, status } : x)) ?? null)
      toast(status === 'fulfilled' ? 'Marked as shipped ✓' : 'Order updated')
    } catch (e) {
      reportError(e)
    }
  }

  const shown = (orders ?? []).filter((o) => filter === 'all' || o.status === filter)

  return (
    <>
      <PageHeader title="Orders" subtitle="Everything people bought. Mark orders as shipped once they’re on the way." />
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter orders">
        {(['all', 'paid', 'fulfilled'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f} className={cx('btn btn-sm', filter === f ? 'bg-ink text-white' : 'btn-soft')}>
            {f === 'all' ? 'All' : STATUS[f].label}
          </button>
        ))}
      </div>
      {error && <ErrorState message={error} onRetry={() => void reload()} />}
      {!orders && !error && <Spinner />}
      {orders && shown.length === 0 && <EmptyState title="No orders here yet">When someone buys something, it shows up here.</EmptyState>}
      <ul className="space-y-3">
        {shown.map((o) => {
          const isOpen = open === o.id
          const addr = address(o)
          return (
            <li key={o.id} className="card overflow-hidden">
              <button className="flex w-full items-center gap-3 px-4 py-4 text-left" onClick={() => setOpen(isOpen ? null : o.id)} aria-expanded={isOpen}>
                <span className={cx('chip shrink-0', STATUS[o.status].cls)}>{STATUS[o.status].label}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display font-semibold">{o.customer_name ?? o.email ?? 'Customer'}</span>
                  <span className="text-sm text-muted">
                    {shortDate(o.created_at)} · {(o.order_items ?? []).reduce((n, i) => n + i.quantity, 0)} items{!o.livemode && !o.stripe_session_id.startsWith('sample') ? ' · test' : ''}
                  </span>
                </span>
                <span className="shrink-0 font-display text-lg font-semibold">{money(o.amount_total_cents)}</span>
              </button>
              {isOpen && (
                <div className="space-y-4 border-t-2 border-blush px-4 py-4">
                  <ul className="space-y-1">
                    {(o.order_items ?? []).map((it) => (
                      <li key={it.id} className="flex justify-between gap-3 text-sm">
                        <span>{it.quantity}× {it.name}{it.size ? ` (${it.size})` : ''}{it.product_type === 'dropship' ? ' · order from supplier' : ''}</span>
                        <span className="tabular-nums">{money(it.unit_price_cents * it.quantity)}</span>
                      </li>
                    ))}
                    <li className="flex justify-between text-sm text-muted"><span>Shipping</span><span>{money(o.amount_shipping_cents) || '$0'}</span></li>
                  </ul>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-blush px-4 py-3 text-sm">
                      <p className="font-display font-semibold">Ship to</p>
                      <p className="whitespace-pre-line">{addr ?? 'No address recorded'}</p>
                    </div>
                    <div className="rounded-2xl bg-blush px-4 py-3 text-sm">
                      <p className="font-display font-semibold">Contact</p>
                      <p className="break-all">{o.email ?? 'No email'}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {o.status === 'paid' && <button className="btn btn-primary btn-sm" onClick={() => setStatus(o, 'fulfilled')}>Mark as shipped</button>}
                    {o.status === 'fulfilled' && <button className="btn btn-soft btn-sm" onClick={() => setStatus(o, 'paid')}>Move back to “to ship”</button>}
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}
