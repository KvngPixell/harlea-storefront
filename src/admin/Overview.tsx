import { useCallback, useEffect, useMemo, useState } from 'react'
import { ErrorState, Spinner } from '../components/ui'
import { cx, money, shortDate } from '../lib/format'
import { Link } from '../lib/router'
import { store } from '../lib/store'
import type { Order } from '../types'
import { useAdminCtx } from './AdminApp'
import { ColumnChart, RankBars, StatTile } from './charts'
import { PageHeader, Panel } from './components'

export function useOrders() {
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(
    () =>
      store.listOrders().then(
        (o) => { setOrders(o); setError(null) },
        () => setError('Couldn’t load orders. Please try again.'),
      ),
    [],
  )
  useEffect(() => {
    void load()
  }, [load])
  return { orders, error, reload: load, setOrders }
}

const counted = (o: Order) => o.status === 'paid' || o.status === 'fulfilled'

export default function Overview() {
  const { catalog, demo } = useAdminCtx()
  const { orders, error, reload } = useOrders()
  const [days, setDays] = useState<7 | 30>(30)

  const stats = useMemo(() => {
    if (!orders) return null
    const since = Date.now() - days * 86400000
    const inRange = orders.filter((o) => counted(o) && new Date(o.created_at).getTime() >= since)
    const revenue = inRange.reduce((s, o) => s + o.amount_total_cents, 0)
    const items = inRange.reduce((s, o) => s + (o.order_items ?? []).reduce((n, it) => n + it.quantity, 0), 0)
    const perDay: Array<{ label: string; value: number }> = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - i)
      const next = d.getTime() + 86400000
      const value = inRange
        .filter((o) => { const t = new Date(o.created_at).getTime(); return t >= d.getTime() && t < next })
        .reduce((s, o) => s + o.amount_total_cents, 0)
      perDay.push({ label: shortDate(d.toISOString()), value })
    }
    const units = new Map<string, number>()
    for (const o of inRange) for (const it of o.order_items ?? []) units.set(it.name, (units.get(it.name) ?? 0) + it.quantity)
    const best = [...units.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, value]) => ({ label, value }))
    const toShip = orders.filter((o) => o.status === 'paid').length
    return { revenue, count: inRange.length, items, avg: inRange.length ? Math.round(revenue / inRange.length) : 0, perDay, best, toShip }
  }, [orders, days])

  const live = catalog.products.filter((p) => p.is_published && !p.is_sold).length
  const hidden = catalog.products.filter((p) => !p.is_published).length

  return (
    <>
      <PageHeader
        title="Hi there! 💕"
        subtitle={demo ? 'These are sample numbers so you can see how it looks.' : 'Here’s how the shop is doing.'}
        actions={
          <div className="inline-flex rounded-full bg-white p-1 ring-2 ring-petal" role="group" aria-label="Time range">
            {([7, 30] as const).map((d) => (
              <button key={d} onClick={() => setDays(d)} aria-pressed={days === d} className={cx('rounded-full px-4 py-1.5 font-display text-sm font-semibold', days === d ? 'bg-rose text-white' : 'text-muted')}>
                {d} days
              </button>
            ))}
          </div>
        }
      />
      {error && <ErrorState message={error} onRetry={() => void reload()} />}
      {!orders && !error && <Spinner />}
      {stats && (
        <div className="space-y-5">
          {stats.toShip > 0 && (
            <Link to="/admin/orders" className="flex items-center justify-between rounded-3xl bg-butter px-5 py-4 font-display text-lg ring-2 ring-white">
              📦 {stats.toShip} order{stats.toShip > 1 ? 's' : ''} waiting to ship <span className="text-rose">See orders →</span>
            </Link>
          )}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Sales" value={money(stats.revenue)} note={`last ${days} days`} />
            <StatTile label="Orders" value={String(stats.count)} />
            <StatTile label="Items sold" value={String(stats.items)} />
            <StatTile label="Average order" value={money(stats.avg)} />
          </div>
          <Panel>
            <ColumnChart title={`Sales per day (last ${days} days)`} data={stats.perDay} fullFormat={(v) => money(v) || '$0'} />
          </Panel>
          <div className="grid gap-5 md:grid-cols-2">
            <Panel title="Best sellers">
              {stats.best.length ? <RankBars rows={stats.best} unit="sold" /> : <p className="text-muted">No sales in this period yet.</p>}
            </Panel>
            <Panel title="Your shop">
              <ul className="space-y-2">
                <li className="flex justify-between"><span>Products live</span><strong>{live}</strong></li>
                <li className="flex justify-between"><span>Hidden products</span><strong>{hidden}</strong></li>
                <li className="flex justify-between"><span>Outfits</span><strong>{catalog.outfits.length}</strong></li>
                <li className="flex justify-between"><span>Shop tabs</span><strong>{catalog.tabs.length}</strong></li>
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to="/admin/products/new" className="btn btn-primary btn-sm">+ Add a product</Link>
                <Link to="/admin/ideas" className="btn btn-soft btn-sm">Add an idea</Link>
              </div>
            </Panel>
          </div>
          {orders && orders.length > 0 && (
            <Panel title="Latest orders" actions={<Link to="/admin/orders" className="text-sm text-rose underline">All orders</Link>}>
              <ul className="divide-y-2 divide-blush">
                {orders.slice(0, 5).map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="min-w-0 truncate">{o.customer_name ?? o.email ?? 'Customer'}<span className="ml-2 text-sm text-muted">{shortDate(o.created_at)}</span></span>
                    <span className="shrink-0 font-display font-semibold">{money(o.amount_total_cents)}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      )}
    </>
  )
}
