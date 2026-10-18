// Small, dependency-free charts for the sales dashboard.
import { useState } from 'react'
import { cx } from '../lib/format'

const compactMoney = (cents: number) => {
  const d = cents / 100
  if (d >= 1000) return `$${(d / 1000).toFixed(d >= 10000 ? 0 : 1)}K`
  return `$${Math.round(d)}`
}

function niceMax(v: number): number {
  if (v <= 0) return 100
  const pow = 10 ** Math.floor(Math.log10(v))
  const n = v / pow
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10
  return step * pow
}

/** Column chart (one series). Hover/tap a column to see its value. */
export function ColumnChart({ data, title, valueFormat = compactMoney, fullFormat = compactMoney }: {
  data: Array<{ label: string; value: number }>
  title: string
  valueFormat?: (v: number) => string
  fullFormat?: (v: number) => string
}) {
  const [hover, setHover] = useState<number | null>(null)
  const [asTable, setAsTable] = useState(false)
  const W = 640
  const H = 220
  const pad = { l: 44, r: 8, t: 12, b: 28 }
  const max = niceMax(Math.max(...data.map((d) => d.value), 0))
  const innerW = W - pad.l - pad.r
  const innerH = H - pad.t - pad.b
  const band = innerW / Math.max(1, data.length)
  const barW = Math.max(2, Math.min(24, band - 2))
  const y = (v: number) => pad.t + innerH - (v / max) * innerH
  const ticks = [0, max / 2, max]
  const labelEvery = Math.ceil(data.length / 7)

  return (
    <figure className="m-0">
      <div className="mb-2 flex items-center justify-between gap-2">
        <figcaption className="font-display font-semibold">{title}</figcaption>
        <button className="btn btn-ghost btn-sm !min-h-8 text-sm" onClick={() => setAsTable((t) => !t)}>
          {asTable ? 'Show chart' : 'Show as table'}
        </button>
      </div>
      {asTable ? (
        <div className="max-h-64 overflow-auto rounded-2xl ring-2 ring-petal">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-blush text-left"><tr><th className="px-3 py-2">Day</th><th className="px-3 py-2 text-right">Value</th></tr></thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.label} className="border-t border-petal"><td className="px-3 py-1.5">{d.label}</td><td className="px-3 py-1.5 text-right tabular-nums">{fullFormat(d.value)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`${title} chart`} onMouseLeave={() => setHover(null)}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#f3dbe5" strokeWidth={1} />
                <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#7a4868">{valueFormat(t)}</text>
              </g>
            ))}
            {data.map((d, i) => {
              const cx0 = pad.l + band * i + band / 2
              const top = y(d.value)
              const h = pad.t + innerH - top
              const r = Math.min(4, h / 2, barW / 2)
              const x0 = cx0 - barW / 2
              const base = pad.t + innerH
              const path = h <= 0 ? '' : `M${x0},${base} V${top + r} Q${x0},${top} ${x0 + r},${top} H${x0 + barW - r} Q${x0 + barW},${top} ${x0 + barW},${top + r} V${base} Z`
              return (
                <g key={d.label}>
                  {path && <path d={path} fill="#d61f69" opacity={hover === null || hover === i ? 1 : 0.45} />}
                  {i % labelEvery === 0 && (
                    <text x={cx0} y={H - 8} textAnchor="middle" fontSize="11" fill="#7a4868">{d.label}</text>
                  )}
                  <rect
                    x={pad.l + band * i}
                    y={pad.t}
                    width={band}
                    height={innerH}
                    fill="transparent"
                    onMouseEnter={() => setHover(i)}
                    onClick={() => setHover(i)}
                  />
                </g>
              )
            })}
          </svg>
          {hover !== null && data[hover] && (
            <div
              className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-xl bg-ink px-3 py-1.5 text-xs text-white shadow-lg"
              style={{ left: `${((pad.l + band * hover + band / 2) / W) * 100}%` }}
            >
              <strong className="block">{fullFormat(data[hover].value)}</strong>
              {data[hover].label}
            </div>
          )}
        </div>
      )}
    </figure>
  )
}

/** Ranked horizontal bars with the value at the tip. */
export function RankBars({ rows, unit }: { rows: Array<{ label: string; value: number }>; unit: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <ol className="space-y-3">
      {rows.map((r, i) => (
        <li key={r.label}>
          <div className="mb-1 flex justify-between gap-3 text-sm">
            <span className="truncate"><span className="mr-2 text-muted">{i + 1}.</span>{r.label}</span>
            <span className="shrink-0 tabular-nums text-muted">{r.value} {unit}</span>
          </div>
          <div className="h-3 rounded-full bg-blush">
            <div className={cx('h-3 rounded-full bg-rose')} style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ol>
  )
}

export function StatTile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="card px-4 py-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold sm:text-3xl">{value}</p>
      {note && <p className="mt-0.5 text-xs text-muted">{note}</p>}
    </div>
  )
}
