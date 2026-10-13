import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../store'
import { EXERCISES } from '../data'
import { addDays, todayISO } from '../engine'
import { mergeLogs, mergeWeights, type ImportResult } from '../importer'
import WeightImporter from '../WeightImporter'
import HistoryImporter from '../HistoryImporter'
import type { LogEntry, WeightLog, WorkoutLog } from '../types'

const BASELINE_IDS = ['bench', 'incdb', 'chestmach', 'row', 'pulldown', 'cablerow', 'squat', 'legpress', 'rdl', 'deadlift', 'dbpress', 'latraise', 'dbcurl', 'pushdown']

export default function ImportHistory() {
  const { data, update } = useApp()
  const [tab, setTab] = useState<'paste' | 'start' | 'weight'>('paste')
  const [done, setDone] = useState('')
  const [doneLink, setDoneLink] = useState<{ to: string; label: string }>({ to: '/workout', label: 'See today’s workout' })

  const doImport = (result: ImportResult) => {
    if (!result.logs.length) return
    update((d) => ({ ...d, logs: mergeLogs(d.logs, result.logs) }))
    setDone(`Imported ${result.setCount} sets across ${result.logs.length} workout${result.logs.length === 1 ? '' : 's'}. Your next workouts will use these weights.`)
    setDoneLink({ to: '/workout', label: 'See today’s workout' })
  }
  const doImportWeights = (entries: WeightLog[]) => {
    const merged = mergeWeights(data.weights, entries)
    update((d) => ({ ...d, weights: mergeWeights(d.weights, entries).weights }))
    setDone(`Added ${merged.added} weigh-in${merged.added === 1 ? '' : 's'}${merged.kept ? ` (${merged.kept} day${merged.kept === 1 ? '' : 's'} you had already logged kept your number)` : ''}.`)
    setDoneLink({ to: '/progress', label: 'See your graph' })
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
      <div><h1>Import your history</h1><p className="mute">Don’t start from scratch. Bring in what you’ve already lifted and weighed.</p></div>
      <div className="tabs">
        <button className={tab === 'paste' ? 'on' : ''} onClick={() => setTab('paste')}>Lifts</button>
        <button className={tab === 'start' ? 'on' : ''} onClick={() => setTab('start')}>Starting weights</button>
        <button className={tab === 'weight' ? 'on' : ''} onClick={() => setTab('weight')}>Body weight</button>
      </div>

      {tab === 'paste' && <HistoryImporter onImport={doImport} />}

      {tab === 'weight' && <WeightImporter existing={data.weights} onImport={doImportWeights} />}

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

      {done && <div className="ok-text">✓ {done} <Link to={doneLink.to} style={{ textDecoration: 'underline' }}>{doneLink.label}</Link></div>}
    </>
  )
}
