import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useApp } from '../store'
import { CARDIO_KINDS } from '../data'
import { todayISO } from '../engine'

export default function QuickLog() {
  const { data, update } = useApp()
  const [params, setParams] = useSearchParams()
  const tab = params.get('t') === 'weight' ? 'weight' : 'cardio'
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
  const recent = data.cardio.slice(-3).reverse()

  return (
    <>
      <h1>Quick log</h1>
      <div className="tabs">
        <button className={tab === 'cardio' ? 'on' : ''} onClick={() => { setParams({ t: 'cardio' }); setMsg('') }}>Cardio</button>
        <button className={tab === 'weight' ? 'on' : ''} onClick={() => { setParams({ t: 'weight' }); setMsg('') }}>Body weight</button>
      </div>
      {tab === 'cardio' ? (
        <section className="card">
          <div className="chips">{CARDIO_KINDS.map((k) => <button key={k} className={`chip ${kind === k ? 'on' : ''}`} onClick={() => setKind(k)}>{k}</button>)}</div>
          <label>Minutes<input inputMode="numeric" value={mins} onChange={(e) => setMins(e.target.value)} placeholder="20" /></label>
          <label>Notes<input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Speed, incline, how it felt" /></label>
          <button className="primary" onClick={saveCardio}>Save cardio</button>
          {recent.map((c, i) => <div key={i} className="small mute">{c.date} · {c.kind} · {c.minutes} min</div>)}
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
