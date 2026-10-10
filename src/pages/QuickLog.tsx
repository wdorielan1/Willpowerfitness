import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useApp } from '../store'
import { CARDIO_KINDS } from '../data'
import { todayISO } from '../engine'

export default function QuickLog() {
  const { data, update } = useApp()
  const [params, setParams] = useSearchParams()
  const t = params.get('t')
  const tab = t === 'weight' ? 'weight' : t === 'steps' ? 'steps' : 'cardio'
  const [steps, setSteps] = useState('')
  const [kind, setKind] = useState(CARDIO_KINDS[2])
  const [mins, setMins] = useState('')
  const [note, setNote] = useState('')
  const [lbs, setLbs] = useState('')
  const [msg, setMsg] = useState('')
  const today = todayISO()

  const saveCardio = () => {
    if (!(Number(mins) > 0)) return
    update((d) => ({ ...d, cardio: [...d.cardio, { date: today, kind, minutes: Number(mins), note }] }))
    setMins(''); setNote(''); setMsg('Cardio logged.')
  }
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
  const recent = data.cardio.slice(-3).reverse()

  return (
    <>
      <h1>Quick log</h1>
      <div className="tabs">
        <button className={tab === 'cardio' ? 'on' : ''} onClick={() => { setParams({ t: 'cardio' }); setMsg('') }}>Cardio</button>
        <button className={tab === 'weight' ? 'on' : ''} onClick={() => { setParams({ t: 'weight' }); setMsg('') }}>Body weight</button>
        <button className={tab === 'steps' ? 'on' : ''} onClick={() => { setParams({ t: 'steps' }); setMsg('') }}>Steps</button>
      </div>
      {tab === 'cardio' ? (
        <section className="card">
          <div className="chips">{CARDIO_KINDS.map((k) => <button key={k} className={`chip ${kind === k ? 'on' : ''}`} onClick={() => setKind(k)}>{k}</button>)}</div>
          <label>Minutes<input inputMode="numeric" value={mins} onChange={(e) => setMins(e.target.value)} placeholder="20" /></label>
          <label>Notes<input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Speed, incline, how it felt" /></label>
          <button className="primary" onClick={saveCardio}>Save cardio</button>
          {recent.map((c, i) => <div key={i} className="small mute">{c.date} · {c.kind} · {c.minutes} min</div>)}
        </section>
      ) : tab === 'steps' ? (
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
