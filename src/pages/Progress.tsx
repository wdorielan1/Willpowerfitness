import { useMemo, useState } from 'react'
import { ConfirmSheet } from '../components'
import { Link } from 'react-router-dom'
import { useApp } from '../store'
import { addDays, e1rm, streak, todayISO, weekCounts } from '../engine'

function Line({ pts, unit }: { pts: { x: string; y: number }[]; unit: string }) {
  if (pts.length < 2) return <p className="small mute">Log at least two sessions to see a trend.</p>
  const W = 320, H = 120, pad = 22
  const ys = pts.map((p) => p.y)
  const lo = Math.min(...ys), hi = Math.max(...ys), span = hi - lo || 1
  const x = (i: number) => pad + (i * (W - pad * 2)) / (pts.length - 1)
  const y = (v: number) => H - pad - ((v - lo) / span) * (H - pad * 2)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Trend in ${unit}`}>
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

  return (
    <>
      <h1>Progress</h1>
      <div className="grid2">
        <Link to="/photos" className="stat"><b>📸</b><span>Progress photos &amp; side-by-sides</span></Link>
        <Link to="/import" className="stat"><b>⬆️</b><span>Import lifting history</span></Link>
      </div>
      <Link to="/export" className="stat" style={{ gridTemplateColumns: 'auto 1fr', alignItems: 'center', display: 'grid', gap: 10 }}><b>🤖</b><span>Export for an AI coach or spreadsheet</span></Link>
      <section className="card hero">
        <h3>Last 7 days</h3>
        <div className="grid3">
          <div className="stat"><b>{wkWorkouts}</b><span>workouts</span></div>
          <div className="stat"><b>{wkMin}</b><span>cardio min</span></div>
          <div className="stat"><b>🔥 {streak(data)}</b><span>streak (best {best})</span></div>
        </div>
        <p className="small mute">{wkWorkouts >= (data.profile?.days.length ?? 3) ? 'You hit your weekly target. Keep stacking.' : `${(data.profile?.days.length ?? 3) - wkWorkouts} more session(s) to hit your weekly target.`}</p>
      </section>

      <section className="card">
        <h3>Consistency · workouts per week</h3>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 90 }}>
          {weeks.map((w) => (
            <div key={w.label} style={{ flex: 1, display: 'grid', gap: 4, justifyItems: 'center' }}>
              <div style={{ width: '100%', height: Math.max(4, (w.count / maxW) * 64), background: 'var(--accent)', borderRadius: 6 }} />
              <span className="small mute" style={{ fontSize: 10 }}>{w.count}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h3>Strength · estimated 1RM</h3>
        {lifts.length ? (
          <>
            <select value={exId} onChange={(e) => setSel(e.target.value)}>{lifts.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select>
            <Line pts={strengthPts} unit="lb" />
          </>
        ) : <p className="small mute">Finish a workout and log sets to see strength trends.</p>}
      </section>

      <section className="card">
        <div className="row"><h3>Body weight</h3><Link to="/log?t=weight" className="small-btn btn ghost">Log</Link></div>
        <Line pts={wPts} unit="lb" />
        {wPts.length > 1 && <p className="small mute">{wDelta > 0 ? '+' : ''}{wDelta} lb since you started · target {data.profile?.target} lb</p>}
      </section>

      <section className="card">
        <h3>Workout history</h3>
        {history.length === 0 && <p className="small mute">No workouts logged yet.</p>}
        {history.map((l) => (
          <div className="row small" key={l.date + (l.baseline ? 'b' : '')}>
            <span><b>{l.baseline ? 'Starting weights' : l.dayType}</b> · {l.date.slice(5)}{l.imported ? ' · imported' : ''}{l.skipped ? ' · skipped' : ''}<br /><span className="mute">{l.skipped ? 'Marked as skipped' : `${l.entries.length} exercises · ${l.entries.reduce((a, e) => a + e.sets.length, 0)} sets${l.minutes ? ` · ${l.minutes} min` : ''}`}</span></span>
            <button className="ghost small-btn" onClick={() => setDel(l.date + (l.baseline ? '|b' : ''))}>Delete</button>
          </div>
        ))}
      </section>

      <section className="card">
        <div className="row"><h3>Cardio</h3><Link to="/log?t=cardio" className="small-btn btn ghost">Log</Link></div>
        {wkCardio.length ? wkCardio.map((c, i) => <div key={i} className="row small"><span>{c.date.slice(5)} · {c.kind}</span><b>{c.minutes} min</b></div>) : <p className="small mute">No cardio logged this week.</p>}
      </section>
      {del && <ConfirmSheet title="Delete this workout?" message="Are you sure you want to delete this workout? It will be removed from your history and can't be recovered." confirmLabel="Yes, delete it" onConfirm={() => { const [dt, b] = del.split('|'); removeLog(dt, !!b); setDel(null) }} onCancel={() => setDel(null)} />}
    </>
  )
}
