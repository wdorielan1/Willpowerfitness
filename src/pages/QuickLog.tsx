import { useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../store'
import { todayISO } from '../engine'

/** Body weight and steps. Cardio has its own page now; the old /log?t=cardio link lands there. */
export default function QuickLog() {
  const { data, update } = useApp()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const t = params.get('t')
  const tab = t === 'steps' ? 'steps' : 'weight'
  const [steps, setSteps] = useState('')
  const [lbs, setLbs] = useState('')
  const [msg, setMsg] = useState('')
  const today = todayISO()

  if (t === 'cardio') return <Navigate to="/cardio?log=1" replace />

  const saveWeight = () => {
    if (!(Number(lbs) > 0)) return
    update((d) => ({ ...d, weights: [...d.weights.filter((w) => w.date !== today), { date: today, lbs: Number(lbs) }] }))
    setLbs(''); setMsg('Body weight logged.')
  }
  const saveSteps = () => {
    const n = Math.round(Number(steps.replace(/,/g, '')))
    if (!(n > 0)) return
    update((d) => ({ ...d, steps: [...d.steps.filter((s) => s.date !== today), { date: today, steps: n }] }))
    setSteps(''); setMsg('Steps saved.')
  }

  return (
    <>
      <h1>Quick log</h1>
      <div className="tabs">
        <button onClick={() => nav('/cardio')}>Cardio</button>
        <button className={tab === 'weight' ? 'on' : ''} onClick={() => { setParams({ t: 'weight' }); setMsg('') }}>Body weight</button>
        <button className={tab === 'steps' ? 'on' : ''} onClick={() => { setParams({ t: 'steps' }); setMsg('') }}>Steps</button>
      </div>
      {tab === 'steps' ? (
        <section className="card">
          <label>Today’s steps<input inputMode="numeric" value={steps} onChange={(e) => setSteps(e.target.value)} placeholder={String(data.steps.find((s) => s.date === today)?.steps ?? '8,000')} /></label>
          <button className="primary" onClick={saveSteps}>Save steps</button>
          <p className="small mute">Enter your total for today (your phone’s Health app shows it). Saving again replaces today’s number.</p>
        </section>
      ) : (
        <section className="card">
          <label>Body weight (lb)<input inputMode="decimal" value={lbs} onChange={(e) => setLbs(e.target.value)} placeholder={String(data.weights.at(-1)?.lbs ?? '')} /></label>
          <button className="primary" onClick={saveWeight}>Save weight</button>
        </section>
      )}
      {msg && <div className="ok-text">✓ {msg}</div>}
    </>
  )
}
