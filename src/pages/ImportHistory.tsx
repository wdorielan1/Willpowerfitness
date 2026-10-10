import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../store'
import { EXERCISES } from '../data'
import { addDays, todayISO } from '../engine'
import { CHATGPT_PROMPT, mergeLogs, parseHistory } from '../importer'
import type { LogEntry, WorkoutLog } from '../types'

const BASELINE_IDS = ['bench', 'incdb', 'chestmach', 'row', 'pulldown', 'cablerow', 'squat', 'legpress', 'rdl', 'deadlift', 'dbpress', 'latraise', 'dbcurl', 'pushdown']

export default function ImportHistory() {
  const { data, update } = useApp()
  const [tab, setTab] = useState<'paste' | 'start'>('paste')
  const [text, setText] = useState('')
  const [kg, setKg] = useState(false)
  const [undated, setUndated] = useState(addDays(todayISO(), -1))
  const [done, setDone] = useState('')
  const [copied, setCopied] = useState(false)
  const file = useRef<HTMLInputElement>(null)
  const result = useMemo(() => (text.trim() ? parseHistory(text, { kg, undatedDate: undated }) : null), [text, kg, undated])

  const doImport = () => {
    if (!result?.logs.length) return
    update((d) => ({ ...d, logs: mergeLogs(d.logs, result.logs) }))
    setDone(`Imported ${result.setCount} sets across ${result.logs.length} workout${result.logs.length === 1 ? '' : 's'}. Your next workouts will use these weights.`)
    setText('')
  }

  // starting weights
  const lifts = BASELINE_IDS.map((id) => EXERCISES.find((e) => e.id === id)!).filter(Boolean)
  const [w, setW] = useState<Record<string, { weight: string; reps: string }>>(() => {
    const base = data.logs.find((l) => l.baseline)
    const o: Record<string, { weight: string; reps: string }> = {}
    base?.entries.forEach((e) => { const s = e.sets[0]; if (s) o[e.exId] = { weight: String(s.weight), reps: String(s.reps) } })
    return o
  })
  const saveStart = () => {
    const entries: LogEntry[] = lifts.flatMap((ex) => {
      const v = w[ex.id]
      const weight = Number(v?.weight), reps = Number(v?.reps) || ex.reps[1]
      if (!(weight >= 0) || v?.weight === '' || !v) return []
      return [{ exId: ex.id, name: ex.name, sets: [{ weight, reps }, { weight, reps }, { weight, reps }], note: 'Starting weight' }]
    })
    const log: WorkoutLog = { date: addDays(todayISO(), -14), dayType: 'Full Body', short: false, baseline: true, entries }
    update((d) => ({ ...d, logs: [...d.logs.filter((l) => !l.baseline), ...(entries.length ? [log] : [])].sort((a, b) => a.date.localeCompare(b.date)) }))
    setDone(entries.length ? `Saved starting weights for ${entries.length} lifts.` : 'Cleared starting weights.')
  }

  return (
    <>
      <div><h1>Import your lifting history</h1><p className="mute">Don’t start from scratch. Bring in what you’ve already lifted.</p></div>
      <div className="tabs">
        <button className={tab === 'paste' ? 'on' : ''} onClick={() => setTab('paste')}>Paste / upload</button>
        <button className={tab === 'start' ? 'on' : ''} onClick={() => setTab('start')}>Starting weights</button>
      </div>

      {tab === 'paste' && (
        <>
          <section className="card">
            <h3>Got your history in ChatGPT (or notes)?</h3>
            <p className="small mute">Paste this to ChatGPT, then copy its CSV back here. No AI connection or key is needed on our side.</p>
            <pre style={{ whiteSpace: 'pre-wrap', background: 'var(--card2)', borderRadius: 12, padding: 12, fontSize: 13, margin: 0 }}>{CHATGPT_PROMPT}</pre>
            <button className="ghost" onClick={() => { void navigator.clipboard?.writeText(CHATGPT_PROMPT); setCopied(true) }}>{copied ? 'Copied' : 'Copy the prompt'}</button>
          </section>

          <section className="card">
            <h3>Paste it here</h3>
            <p className="small mute">CSV works best (<code>date,exercise,weight,reps,sets</code>). Plain notes like <code>Bench press: 185x8, 185x8, 175x7</code> work too, with a date on its own line above.</p>
            <textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder={'date,exercise,weight,reps,sets\n2026-09-01,Bench Press,185,8,3'} />
            <input ref={file} type="file" accept=".csv,.txt,text/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) setText(await f.text()); e.target.value = '' }} />
            <div className="row wrap">
              <button className="ghost small-btn" onClick={() => file.current?.click()}>Upload a .csv / .txt file</button>
              <button className={`chip ${kg ? 'on' : ''}`} onClick={() => setKg(!kg)}>{kg ? 'Weights are in kg → convert' : 'Weights in lb'}</button>
            </div>
            <label>Date to use for lines with no date<input type="date" value={undated} max={todayISO()} onChange={(e) => setUndated(e.target.value)} /></label>
          </section>

          {result && (
            <section className="card">
              <h3>Preview</h3>
              {result.logs.length === 0 ? <p className="err">Couldn’t find any sets yet. Check the format above.</p> : (
                <>
                  <p>{result.setCount} sets · {result.logs.length} workout day{result.logs.length === 1 ? '' : 's'} · {result.logs[0].date} → {result.logs[result.logs.length - 1].date}</p>
                  <div className="people">
                    {result.exercises.slice(0, 12).map((e) => (
                      <div className="person" key={e.name}><span className="grow">{e.name}</span><span className={`tag ${e.matched ? 'ok' : 'warn'}`}>{e.matched ? 'matched' : 'custom'}</span><span className="small mute">{e.sets} sets</span></div>
                    ))}
                    {result.exercises.length > 12 && <p className="small mute">…and {result.exercises.length - 12} more</p>}
                  </div>
                  {result.skipped.length > 0 && <p className="small mute">{result.skipped.length} line{result.skipped.length === 1 ? '' : 's'} skipped (no sets found).</p>}
                  <button className="primary" onClick={doImport}>Import {result.setCount} sets</button>
                </>
              )}
            </section>
          )}
        </>
      )}

      {tab === 'start' && (
        <section className="card">
          <h3>Your current working weights</h3>
          <p className="small mute">Just your recent working weight and reps for each lift you do. Leave blank anything you don’t. The workout suggestions start from these.</p>
          {lifts.map((ex) => (
            <div key={ex.id} className="setrow" style={{ gridTemplateColumns: '1.6fr 1fr 1fr' }}>
              <span className="small">{ex.name}</span>
              <input inputMode="decimal" placeholder="lb" value={w[ex.id]?.weight ?? ''} onChange={(e) => setW({ ...w, [ex.id]: { weight: e.target.value, reps: w[ex.id]?.reps ?? '' } })} />
              <input inputMode="numeric" placeholder={`reps (${ex.reps[1]})`} value={w[ex.id]?.reps ?? ''} onChange={(e) => setW({ ...w, [ex.id]: { weight: w[ex.id]?.weight ?? '', reps: e.target.value } })} />
            </div>
          ))}
          <button className="primary" onClick={saveStart}>Save starting weights</button>
        </section>
      )}

      {done && <div className="ok-text">✓ {done} <Link to="/workout" style={{ textDecoration: 'underline' }}>See today’s workout</Link></div>}
    </>
  )
}
