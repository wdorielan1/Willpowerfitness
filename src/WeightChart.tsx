import { fromISO } from './engine'

export interface WeightPoint { x: string; y: number }

const dayNum = (iso: string) => Math.round(fromISO(iso).getTime() / 86400000)
const label = (iso: string) => fromISO(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })

/** Average of every reading in the 7 days up to each point, so daily ups and downs settle into a trend. */
export function movingAverage(pts: WeightPoint[], days = 7): WeightPoint[] {
  return pts.map((p, i) => {
    const t = dayNum(p.x)
    let sum = 0, n = 0
    for (let j = i; j >= 0 && t - dayNum(pts[j].x) < days; j--) { sum += pts[j].y; n++ }
    return { x: p.x, y: sum / n }
  })
}

/**
 * Body weight over time. Daily readings are a thin line (with dots when there are only a few),
 * and a thick line shows the 7-day average. Dates sit on a true time axis, so missed days show as gaps.
 */
export function WeightChart({ pts, empty, label: aria = 'Body weight trend' }: { pts: WeightPoint[]; empty: string; label?: string }) {
  if (pts.length < 2) return <p className="progress-empty">{empty}</p>
  const W = 340, H = 170, L = 36, R = 10, T = 12, B = 26
  const avg = pts.length >= 7 ? movingAverage(pts) : null
  const all = [...pts.map((p) => p.y), ...(avg?.map((p) => p.y) ?? [])]
  const pad = Math.max(0.5, (Math.max(...all) - Math.min(...all)) * 0.12)
  const lo = Math.min(...all) - pad, hi = Math.max(...all) + pad
  const t0 = dayNum(pts[0].x), t1 = dayNum(pts[pts.length - 1].x), span = Math.max(1, t1 - t0)
  const x = (iso: string) => L + ((dayNum(iso) - t0) / span) * (W - L - R)
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B)
  const line = (a: WeightPoint[]) => a.map((p) => `${x(p.x).toFixed(1)},${y(p.y).toFixed(1)}`).join(' ')
  const ticks = [hi - pad * 0.5, (hi + lo) / 2, lo + pad * 0.5]
  const last = pts[pts.length - 1], first = pts[0]
  const lastAvg = avg?.[avg.length - 1]
  const showDots = pts.length <= 45
  return (
    <div className="weight-chart">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`${aria}: ${pts.length} weigh-ins from ${label(first.x)} to ${label(last.x)}, ${first.y} to ${last.y} pounds`}>
        {ticks.map((v, i) => <g key={i}><line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeWidth="1" /><text x={L - 6} y={y(v) + 4} textAnchor="end">{Math.round(v)}</text></g>)}
        <polyline fill="none" stroke={avg ? 'var(--mute)' : 'var(--accent)'} strokeOpacity={avg ? 0.55 : 1} strokeWidth={avg ? 1.5 : 3} strokeLinejoin="round" strokeLinecap="round" points={line(pts)} />
        {showDots && pts.map((p) => <circle key={p.x} cx={x(p.x)} cy={y(p.y)} r={avg ? 2 : 3.5} fill={avg ? 'var(--mute)' : 'var(--accent)'} />)}
        {avg && <polyline fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" points={line(avg)} />}
        <text x={L} y={H - 6}>{label(first.x)}</text>
        <text x={W - R} y={H - 6} textAnchor="end">{label(last.x)}</text>
      </svg>
      <div className="weight-chart-legend">
        {avg && <span><i className="avg" />7-day average{lastAvg ? ` ${lastAvg.y.toFixed(1)}` : ''}</span>}
        <span><i className="raw" />Daily{avg ? '' : ' weigh-ins'} · latest {last.y} lb</span>
      </div>
    </div>
  )
}
