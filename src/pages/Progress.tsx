import { useMemo, useState } from 'react'
import { ConfirmSheet } from '../components'
import { Link } from 'react-router-dom'
import { useApp } from '../store'
import { addDays, e1rm, fromISO, streak, todayISO, weekCounts } from '../engine'
import { Icon } from '../icons'

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
      <text x={pad} y={H - 4}>{pts[0].x.slice(5)}</text>
      <text x={W - pad} y={H - 4} textAnchor="end">{pts[pts.length - 1].x.slice(5)}</text>
      <text x={pad} y={12}>{hi} {unit}</text>
    </svg>
  )
}

export default function Progress() {
  const { data, update } = useApp()
  const today = todayISO()
  const [del, setDel] = useState<string | null>(null)
  const history = [...data.logs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 15)
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
      return en && { x: l.date, y: Math.max(...en.sets.map((s) => e1rm(s.weight, s.reps))) }
    })
    .filter((v): v is { x: string; y: number } => !!v)
    .sort((a, b) => a.x.localeCompare(b.x))
  const wPts = [...data.weights].sort((a, b) => a.date.localeCompare(b.date)).map((w) => ({ x: w.date, y: w.lbs }))
  const weeks = weekCounts(data)
  const maxW = Math.max(1, ...weeks.map((w) => w.count))
  const wkStart = addDays(today, -6)
  const wkWorkouts = Object.entries(data.checkins).filter(([d, c]) => d >= wkStart && c.done).length
  const wkCardio = data.cardio.filter((c) => c.date >= wkStart)
  const wkMin = wkCardio.reduce((a, c) => a + c.minutes, 0)
  const wDelta = wPts.length > 1 ? Math.round((wPts[wPts.length - 1].y - wPts[0].y) * 10) / 10 : 0
  const best = Math.max(0, ...Object.keys(data.checkins).sort().reduce<number[]>((acc, d) => { acc.push(data.checkins[d].done ? (acc.at(-1) ?? 0) + 1 : 0); return acc }, []))

  const weeklyTarget = data.profile?.days.length ?? 3
  const remaining = Math.max(0, weeklyTarget - wkWorkouts)

  return (
    <div className="progress-page">
      <h1>Progress</h1>

      <section className="progress-summary" aria-labelledby="progress-summary-title">
        <div className="progress-section-head"><h2 id="progress-summary-title">Last 7 days</h2><span>{dateLabel(wkStart)} – {dateLabel(today)}</span></div>
        <div className="progress-metrics">
          <div className="progress-metric"><Icon name="weight" size={18} /><strong>{wkWorkouts}</strong><span>Workouts</span></div>
          <div className="progress-metric"><Icon name="clock" size={18} /><strong>{wkMin}</strong><span>Cardio min</span></div>
          <div className="progress-metric"><Icon name="check" size={18} /><strong>{streak(data)}</strong><span>Day streak</span></div>
        </div>
        <div className="progress-summary-footer"><p>{remaining === 0 ? 'Weekly target reached.' : `${remaining} ${remaining === 1 ? 'session' : 'sessions'} to reach your weekly target.`}</p><span>Best streak: {best}</span></div>
      </section>

      <nav className="progress-tools" aria-label="Progress tools">
        <Link to="/photos" aria-label="Progress photos" title="Progress photos and comparisons"><Icon name="photo" size={20} /><span>Photos</span></Link>
        <Link to="/import" aria-label="Import lifting history" title="Import lifting history"><Icon name="upload" size={20} /><span>Import</span></Link>
        <Link to="/export" aria-label="Export training data" title="Export training data"><Icon name="download" size={20} /><span>Export</span></Link>
      </nav>

      <section className="progress-section" aria-labelledby="progress-consistency-title">
        <div className="progress-section-head"><h2 id="progress-consistency-title">Consistency</h2><span>Workouts per week</span></div>
        <div className="progress-week-chart" role="img" aria-label={`Last ${weeks.length} weeks, oldest to newest: ${weeks.map((w) => `${w.label}: ${w.count} workouts`).join('; ')}`}>
          {weeks.map((w) => (
            <div className="progress-week-column" key={w.label} aria-hidden="true">
              <span className="progress-week-count">{w.count}</span>
              <div className="progress-week-bar-area"><div className={`progress-week-bar${w.count === 0 ? ' is-empty' : ''}`} style={{ height: Math.max(3, (w.count / maxW) * 72) }} /></div>
            </div>
          ))}
        </div>
        <div className="progress-chart-dates" aria-hidden="true"><span>{dateLabel(addDays(today, -fromISO(today).getDay() - 49))}</span><span>This week</span></div>
      </section>

      <section className="progress-section" aria-labelledby="progress-strength-title">
        <div className="progress-section-head"><h2 id="progress-strength-title">Strength</h2><span>Estimated one-rep max</span></div>
        {lifts.length ? (
          <>
            <label className="progress-lift-picker">Exercise<select value={exId} onChange={(e) => setSel(e.target.value)}>{lifts.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select></label>
            <Line pts={strengthPts} unit="lb" label={`${lifts.find(([id]) => id === exId)?.[1] ?? 'Strength'} estimated one-rep max trend`} empty="Log this lift in two sessions to see a trend." />
          </>
        ) : <p className="progress-empty">Log sets in a workout to see your strength trend.</p>}
      </section>

      <section className="progress-section" aria-labelledby="progress-weight-title">
        <div className="progress-section-head"><h2 id="progress-weight-title">Body weight</h2><Link to="/log?t=weight" className="progress-log" aria-label="Log body weight"><Icon name="plus" size={16} />Log</Link></div>
        <Line pts={wPts} unit="lb" label="Body weight trend" empty="Log your weight twice to see a trend." />
        {wPts.length > 1 && <p className="progress-note">{wDelta > 0 ? '+' : ''}{wDelta} lb since your first entry · target {data.profile?.target} lb</p>}
      </section>

      <section className="progress-section" aria-labelledby="progress-history-title">
        <div className="progress-section-head"><h2 id="progress-history-title">Workout history</h2>{history.length > 0 && <span>Latest {history.length}</span>}</div>
        {history.length === 0 && <p className="progress-empty">No workouts logged yet.</p>}
        <div className="progress-history">
          {history.map((l) => (
            <div className="progress-history-row" key={l.date + (l.baseline ? 'b' : '')}>
              <div className="progress-history-entry"><div className="progress-history-title"><b>{l.baseline ? 'Starting weights' : l.dayType}</b><time dateTime={l.date}>{dateLabel(l.date)}</time></div><p>{l.skipped ? 'Marked as skipped' : `${l.entries.length} exercises · ${l.entries.reduce((a, e) => a + e.sets.length, 0)} sets${l.minutes ? ` · ${l.minutes} min` : ''}`}</p>{l.imported && <span className="progress-history-tag">Imported</span>}</div>
              <button className="progress-delete" aria-label={`Delete ${l.baseline ? 'starting weights' : `${l.dayType} workout`} from ${l.date}`} title="Delete workout" onClick={() => setDel(l.date + (l.baseline ? '|b' : ''))}><Icon name="trash" size={18} /></button>
            </div>
          ))}
        </div>
      </section>

      <section className="progress-section" aria-labelledby="progress-cardio-title">
        <div className="progress-section-head"><h2 id="progress-cardio-title">Cardio</h2><Link to="/log?t=cardio" className="progress-log" aria-label="Log cardio"><Icon name="plus" size={16} />Log</Link></div>
        {wkCardio.length ? <div className="progress-cardio-list">{wkCardio.map((c, i) => <div key={i} className="progress-cardio-row"><div><b>{c.kind}</b><time dateTime={c.date}>{dateLabel(c.date)}</time></div><span>{c.minutes} min</span></div>)}</div> : <p className="progress-empty">No cardio logged in the last 7 days.</p>}
      </section>
      {del && <ConfirmSheet title="Delete this workout?" message="Are you sure you want to delete this workout? It will be removed from your history and can't be recovered." confirmLabel="Yes, delete it" onConfirm={() => { const [dt, b] = del.split('|'); removeLog(dt, !!b); setDel(null) }} onCancel={() => setDel(null)} />}
    </div>
  )
}
