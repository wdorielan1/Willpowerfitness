import { useMemo, useState } from 'react'
import { ConfirmSheet } from '../components'
import { Link } from 'react-router-dom'
import { useApp } from '../store'
import { addDays, e1rm, fromISO, streak, todayISO, weekCounts } from '../engine'
import { Icon } from '../icons'

const RANGES = [
  { id: '7d', label: '7D', days: 7, name: 'Last 7 days' },
  { id: '30d', label: '30D', days: 30, name: 'Last 30 days' },
  { id: '90d', label: '90D', days: 90, name: 'Last 90 days' },
  { id: '6m', label: '6M', days: 182, name: 'Last 6 months' },
  { id: '1y', label: '1Y', days: 365, name: 'Last year' },
  { id: 'all', label: 'All', days: null, name: 'All time' },
] as const
type RangeId = (typeof RANGES)[number]['id']
const RANGE_KEY = 'wpf.progressRange'
const PAGE = 15

const dateLabel = (date: string) => fromISO(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

function Line({ pts, unit, label, empty }: { pts: { x: string; y: number }[]; unit: string; label: string; empty: string }) {
  if (pts.length < 2) return <p className="progress-empty">{empty}</p>
  const W = 320, H = 120, pad = 22
  const ys = pts.map((p) => p.y)
  const lo = Math.min(...ys), hi = Math.max(...ys), span = hi - lo || 1
  const x = (i: number) => pad + (i * (W - pad * 2)) / (pts.length - 1)
  const y = (v: number) => H - pad - ((v - lo) / span) * (H - pad * 2)
  return (
    <svg className="progress-line" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={label}>
      <path d={`M${pad} ${H / 2}H${W - pad}M${pad} ${H - pad}H${W - pad}`} fill="none" stroke="var(--line)" strokeWidth="1" />
      <polyline fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" points={pts.map((p, i) => `${x(i)},${y(p.y)}`).join(' ')} />
      {pts.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.y)} r="3.5" fill="var(--accent)" />)}
      <text x={pad} y={H - 4}>{dateLabel(pts[0].x)}</text>
      <text x={W - pad} y={H - 4} textAnchor="end">{dateLabel(pts[pts.length - 1].x)}</text>
      <text x={pad} y={12}>{hi} {unit}</text>
    </svg>
  )
}

export default function Progress() {
  const { data, update } = useApp()
  const today = todayISO()
  const [del, setDel] = useState<string | null>(null)
  const [rangeId, setRangeId] = useState<RangeId>(() => {
    try { const v = localStorage.getItem(RANGE_KEY); return (RANGES.find((r) => r.id === v)?.id ?? '7d') as RangeId } catch { return '7d' }
  })
  const [shown, setShown] = useState(PAGE)
  const [cardioShown, setCardioShown] = useState(10)
  const pickRange = (id: RangeId) => { setRangeId(id); setShown(PAGE); setCardioShown(10); try { localStorage.setItem(RANGE_KEY, id) } catch { /* private mode */ } }
  const range = RANGES.find((r) => r.id === rangeId)!
  // the earliest thing you've logged, so "All" starts where your history does
  const firstDate = useMemo(() => {
    const all = [...data.logs.map((l) => l.date), ...data.weights.map((w) => w.date), ...data.cardio.map((c) => c.date), ...Object.entries(data.checkins).filter(([, c]) => c.done).map(([d]) => d)].sort()
    return all[0] ?? today
  }, [data.logs, data.weights, data.cardio, data.checkins, today])
  const rangeStart = range.days ? addDays(today, -(range.days - 1)) : firstDate
  const rangeDays = range.days ?? Math.max(1, Math.round((fromISO(today).getTime() - fromISO(firstDate).getTime()) / 86400000) + 1)
  const history = [...data.logs].filter((l) => l.date >= rangeStart).sort((a, b) => b.date.localeCompare(a.date))
  const removeLog = (date: string, baseline?: boolean) => update((d) => ({
    ...d,
    logs: d.logs.filter((l) => !(l.date === date && !!l.baseline === !!baseline)),
    checkins: baseline ? d.checkins : { ...d.checkins, [date]: { ...d.checkins[date], done: false } },
  }))
  const lifts = useMemo(() => {
    const m = new Map<string, string>()
    data.logs.forEach((l) => l.entries.forEach((e) => m.set(e.exId, e.name)))
    return [...m.entries()]
  }, [data.logs])
  const [sel, setSel] = useState<string>('')
  const exId = sel || lifts[0]?.[0] || ''
  const strengthPts = data.logs
    .map((l) => {
      const en = l.entries.find((e) => e.exId === exId)
      return en && l.date >= rangeStart && { x: l.date, y: Math.max(...en.sets.map((s) => e1rm(s.weight, s.reps))) }
    })
    .filter((v): v is { x: string; y: number } => !!v)
    .sort((a, b) => a.x.localeCompare(b.x))
  const wPts = [...data.weights].filter((w) => w.date >= rangeStart).sort((a, b) => a.date.localeCompare(b.date)).map((w) => ({ x: w.date, y: w.lbs }))
  // the weekly chart always shows at least 8 weeks, and as many as the range covers (up to two years)
  const weekSpan = Math.min(104, Math.max(8, Math.ceil(rangeDays / 7) + (range.days ? 0 : 1)))
  const weeks = weekCounts(data, weekSpan)
  const maxW = Math.max(1, ...weeks.map((w) => w.count))
  const wkWorkouts = Object.entries(data.checkins).filter(([d, c]) => d >= rangeStart && c.done).length
  const wkCardio = data.cardio.filter((c) => c.date >= rangeStart).sort((a, b) => b.date.localeCompare(a.date))
  const wkMin = wkCardio.reduce((a, c) => a + c.minutes, 0)
  const wDelta = wPts.length > 1 ? Math.round((wPts[wPts.length - 1].y - wPts[0].y) * 10) / 10 : 0
  const best = Math.max(0, ...Object.keys(data.checkins).sort().reduce<number[]>((acc, d) => { acc.push(data.checkins[d].done ? (acc.at(-1) ?? 0) + 1 : 0); return acc }, []))

  const weeklyTarget = data.profile?.days.length ?? 3
  const remaining = Math.max(0, weeklyTarget - wkWorkouts)
  const perWeek = Math.round((wkWorkouts / (rangeDays / 7)) * 10) / 10

  return (
    <div className="progress-page">
      <h1>Progress</h1>

      <div className="progress-range" role="group" aria-label="Time range">
        {RANGES.map((r) => <button key={r.id} type="button" className={r.id === rangeId ? 'on' : ''} aria-pressed={r.id === rangeId} onClick={() => pickRange(r.id)}>{r.label}</button>)}
      </div>

      <section className="progress-summary" aria-labelledby="progress-summary-title">
        <div className="progress-section-head"><h2 id="progress-summary-title">{range.name}</h2><span>{dateLabel(rangeStart)} – {dateLabel(today)}</span></div>
        <div className="progress-metrics">
          <div className="progress-metric"><Icon name="weight" size={18} /><strong>{wkWorkouts}</strong><span>Workouts</span></div>
          <div className="progress-metric"><Icon name="clock" size={18} /><strong>{wkMin}</strong><span>Cardio min</span></div>
          <div className="progress-metric"><Icon name="check" size={18} /><strong>{streak(data)}</strong><span>Day streak</span></div>
        </div>
        <div className="progress-summary-footer"><p>{range.id === '7d' ? (remaining === 0 ? 'Weekly target reached.' : `${remaining} ${remaining === 1 ? 'session' : 'sessions'} to reach your weekly target.`) : `About ${perWeek} workouts a week · target ${weeklyTarget}.`}</p><span>Best streak: {best}</span></div>
      </section>

      <nav className="progress-tools" aria-label="Progress tools">
        <Link to="/photos" aria-label="Progress photos" title="Progress photos and comparisons"><Icon name="photo" size={20} /><span>Photos</span></Link>
        <Link to="/import" aria-label="Import lifting history" title="Import lifting history"><Icon name="upload" size={20} /><span>Import</span></Link>
        <Link to="/export" aria-label="Export training data" title="Export training data"><Icon name="download" size={20} /><span>Export</span></Link>
      </nav>

      <section className="progress-section" aria-labelledby="progress-consistency-title">
        <div className="progress-section-head"><h2 id="progress-consistency-title">Consistency</h2><span>Workouts per week</span></div>
        <div className={`progress-week-chart${weeks.length > 16 ? ' is-dense' : ''}`} style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }} role="img" aria-label={`${weeks.length} weeks, oldest to newest: ${weeks.map((w) => `${w.label}: ${w.count} workouts`).join('; ')}`}>
          {weeks.map((w) => (
            <div className="progress-week-column" key={w.label} aria-hidden="true">
              {weeks.length <= 16 && <span className="progress-week-count">{w.count}</span>}
              <div className="progress-week-bar-area"><div className={`progress-week-bar${w.count === 0 ? ' is-empty' : ''}`} style={{ height: Math.max(3, (w.count / maxW) * 72) }} /></div>
            </div>
          ))}
        </div>
        <div className="progress-chart-dates" aria-hidden="true"><span>{dateLabel(addDays(today, -fromISO(today).getDay() - 7 * (weeks.length - 1)))}</span><span>This week</span></div>
      </section>

      <section className="progress-section" aria-labelledby="progress-strength-title">
        <div className="progress-section-head"><h2 id="progress-strength-title">Strength</h2><span>Estimated one-rep max</span></div>
        {lifts.length ? (
          <>
            <label className="progress-lift-picker">Exercise<select value={exId} onChange={(e) => setSel(e.target.value)}>{lifts.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select></label>
            <Line pts={strengthPts} unit="lb" label={`${lifts.find(([id]) => id === exId)?.[1] ?? 'Strength'} estimated one-rep max trend`} empty={`Log this lift in two sessions${range.days ? ` within ${range.name.toLowerCase()}` : ''} to see a trend.`} />
          </>
        ) : <p className="progress-empty">Log sets in a workout to see your strength trend.</p>}
      </section>

      <section className="progress-section" aria-labelledby="progress-weight-title">
        <div className="progress-section-head"><h2 id="progress-weight-title">Body weight</h2><Link to="/log?t=weight" className="progress-log" aria-label="Log body weight"><Icon name="plus" size={16} />Log</Link></div>
        <Line pts={wPts} unit="lb" label="Body weight trend" empty={`Log your weight twice${range.days ? ` within ${range.name.toLowerCase()}` : ''} to see a trend.`} />
        {wPts.length > 1 && <p className="progress-note">{wDelta > 0 ? '+' : ''}{wDelta} lb {range.id === 'all' ? 'since your first entry' : `over ${range.name.toLowerCase()}`} · target {data.profile?.target} lb</p>}
      </section>

      <section className="progress-section" aria-labelledby="progress-history-title">
        <div className="progress-section-head"><h2 id="progress-history-title">Workout history</h2>{history.length > 0 && <span>{history.length} {history.length === 1 ? 'workout' : 'workouts'}</span>}</div>
        {history.length === 0 && <p className="progress-empty">{data.logs.length ? `No workouts in ${range.name.toLowerCase()}. Try a longer range.` : 'No workouts logged yet.'}</p>}
        <div className="progress-history">
          {history.slice(0, shown).map((l) => (
            <div className="progress-history-row" key={l.date + (l.baseline ? 'b' : '')}>
              <div className="progress-history-entry"><div className="progress-history-title"><b>{l.baseline ? 'Starting weights' : l.dayType}</b><time dateTime={l.date}>{dateLabel(l.date)}</time></div><p>{l.skipped ? 'Marked as skipped' : `${l.entries.length} exercises · ${l.entries.reduce((a, e) => a + e.sets.length, 0)} sets${l.minutes ? ` · ${l.minutes} min` : ''}`}</p>{l.imported && <span className="progress-history-tag">Imported</span>}</div>
              <button className="progress-delete" aria-label={`Delete ${l.baseline ? 'starting weights' : `${l.dayType} workout`} from ${l.date}`} title="Delete workout" onClick={() => setDel(l.date + (l.baseline ? '|b' : ''))}><Icon name="trash" size={18} /></button>
            </div>
          ))}
        </div>
        {history.length > shown && <button type="button" className="progress-more" onClick={() => setShown(shown + PAGE)}>Show {Math.min(PAGE, history.length - shown)} more</button>}
      </section>

      <section className="progress-section" aria-labelledby="progress-cardio-title">
        <div className="progress-section-head"><h2 id="progress-cardio-title">Cardio</h2><Link to="/log?t=cardio" className="progress-log" aria-label="Log cardio"><Icon name="plus" size={16} />Log</Link></div>
        {wkCardio.length ? <div className="progress-cardio-list">{wkCardio.slice(0, cardioShown).map((c, i) => <div key={i} className="progress-cardio-row"><div><b>{c.kind}</b><time dateTime={c.date}>{dateLabel(c.date)}</time></div><span>{c.minutes} min</span></div>)}</div> : <p className="progress-empty">No cardio logged in {range.name.toLowerCase()}.</p>}
        {wkCardio.length > cardioShown && <button type="button" className="progress-more" onClick={() => setCardioShown(cardioShown + 10)}>Show {Math.min(10, wkCardio.length - cardioShown)} more</button>}
      </section>
      {del && <ConfirmSheet title="Delete this workout?" message="Are you sure you want to delete this workout? It will be removed from your history and can't be recovered." confirmLabel="Yes, delete it" onConfirm={() => { const [dt, b] = del.split('|'); removeLog(dt, !!b); setDel(null) }} onCancel={() => setDel(null)} />}
    </div>
  )
}
