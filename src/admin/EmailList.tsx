import { useCallback, useEffect, useState } from 'react'
import { EmptyState, ErrorState, Spinner } from '../components/ui'
import { shortDate } from '../lib/format'
import { store } from '../lib/store'
import type { Subscriber } from '../types'
import { Hint, PageHeader, Panel } from './components'

function downloadCsv(rows: Subscriber[]) {
  const lines = ['email,joined,source', ...rows.map((r) => `${r.email},${r.created_at.slice(0, 10)},${r.source ?? ''}`)]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `email-list-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function EmailList() {
  const [rows, setRows] = useState<Subscriber[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(() => store.listSubscribers().then((r) => { setRows(r); setError(null) }, () => setError('Couldn’t load the list.')), [])
  useEffect(() => {
    void load()
  }, [load])
  const active = (rows ?? []).filter((r) => !r.unsubscribed_at)

  return (
    <>
      <PageHeader
        title="Email list"
        subtitle="People who signed up for first dibs on drops (from the box at the bottom of every page)."
        actions={active.length > 0 ? <button className="btn btn-primary" onClick={() => downloadCsv(active)}>Download list (CSV)</button> : undefined}
      />
      <Panel className="mb-4">
        <p className="text-sm">
          <strong className="font-display">{active.length}</strong> people on your list.
          <Hint>To email them, download the list and import it into a free email tool like Brevo (300 emails/day free). Only email people who signed up.</Hint>
        </p>
      </Panel>
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {!rows && !error && <Spinner />}
      {rows && active.length === 0 && <EmptyState title="No sign-ups yet">Share your shop link: the sign-up box is at the bottom of every page.</EmptyState>}
      {active.length > 0 && (
        <ul className="card divide-y-2 divide-blush">
          {active.map((r) => (
            <li key={r.email} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span className="break-all">{r.email}</span>
              <span className="shrink-0 text-muted">{shortDate(r.created_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
