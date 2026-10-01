import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../store'
import { WARMUP } from '../data'
import { cardioFinisher, emptySets, generateWorkout, recommend, swapOptions, todayISO } from '../engine'
import type { LogEntry, SetEntry } from '../types'

const LABEL = { add_weight: 'ADD WEIGHT', add_reps: 'ADD REPS', repeat: 'REPEAT', start: 'FIND YOUR WEIGHT' } as const
const TAG = { add_weight: 'ok', add_reps: 'warn', repeat: 'accent', start: '' } as const

export default function Workout() {
  const { data, update } = useApp()
  const nav = useNavigate()
  const p = data.profile!
  const today = todayISO()
  const short = !!data.short[today]
  const plan = generateWorkout(today, data, short)
  const draft = data.drafts[today] ?? { sets: {}, notes: {} }
  const [saved, setSaved] = useState(false)
  const cardio = cardioFinisher(p, plan.day)

  const setDraft = (fn: (d: typeof draft) => typeof draft) =>
    update((d) => ({ ...d, drafts: { ...d.drafts, [today]: fn(d.drafts[today] ?? { sets: {}, notes: {} }) } }))
  const edit = (exId: string, base: SetEntry[], i: number, k: keyof SetEntry, v: string) =>
    setDraft((dr) => {
      const rows = (dr.sets[exId] ?? base).map((r, j) => (j === i ? { ...r, [k]: v } : r))
      return { ...dr, sets: { ...dr.sets, [exId]: rows } }
    })
  const addSet = (exId: string, base: SetEntry[]) =>
    setDraft((dr) => {
      const rows = dr.sets[exId] ?? base
      return { ...dr, sets: { ...dr.sets, [exId]: [...rows, { ...rows[rows.length - 1], reps: '', rpe: '' }] } }
    })
  const swap = (orig: string, cur: string, next: string) => update((d) => ({ ...d, swaps: { ...d.swaps, [`${today}|${orig}`]: next }, drafts: { ...d.drafts, [today]: { ...(d.drafts[today] ?? { sets: {}, notes: {} }), sets: Object.fromEntries(Object.entries((d.drafts[today]?.sets) ?? {}).filter(([k]) => k !== cur)) } } }))

  const finish = () => {
    const entries: LogEntry[] = plan.items.map(({ ex }) => {
      const rows = draft.sets[ex.id] ?? []
      const sets = rows
        .filter((r) => Number(r.weight) >= 0 && r.weight !== '' && Number(r.reps) > 0)
        .map((r) => ({ weight: Number(r.weight), reps: Number(r.reps), rpe: r.rpe ? Number(r.rpe) : undefined }))
      return { exId: ex.id, name: ex.name, sets, note: draft.notes[ex.id] ?? '' }
    }).filter((x) => x.sets.length)
    update((d) => {
      const { [today]: _gone, ...drafts } = d.drafts
      void _gone
      return {
        ...d, drafts,
        logs: [...d.logs.filter((l) => l.date !== today), { date: today, dayType: plan.day, short, entries }],
        checkins: { ...d.checkins, [today]: { going: true, done: true } },
      }
    })
    setSaved(true)
    setTimeout(() => nav('/'), 900)
  }

  if (plan.day === 'Rest/Cardio') {
    return (
      <>
        <div><h1>Rest / cardio</h1><p className="mute">Recovery is part of the plan. Move, don’t grind.</p></div>
        <section className="card hero">
          <h2>Today’s cardio</h2>
          <p>{cardio ?? 'Optional walk or mobility. Cardio is off in your profile.'}</p>
          <Link className="btn primary" to="/log">Log cardio</Link>
        </section>
      </>
    )
  }

  return (
    <>
      <div className="row"><div><h1>{plan.day}</h1><p className="mute">{short ? 'Short version · ~30 min' : 'Full session'} · {plan.items.length} exercises</p></div></div>
      <button className={`chip ${short ? 'on' : ''}`} style={{ justifySelf: 'start' }} onClick={() => update((d) => ({ ...d, short: { ...d.short, [today]: !short } }))}>
        {short ? '✓ Short on time / fatigued' : 'Short on time or fatigued?'}
      </button>

      <details className="card" open={false}>
        <summary style={{ fontWeight: 800, cursor: 'pointer' }}>Warm-up</summary>
        <ol className="steps" style={{ marginTop: 10 }}>{WARMUP[plan.day].map((w) => <li className="step" key={w}>{w}</li>)}</ol>
      </details>

      {plan.items.map(({ ex, sets, swapped }, idx) => {
        const rec = recommend(ex, data.logs, today)
        const rows = draft.sets[ex.id] ?? emptySets(sets, rec.weight)
        const opts = swapOptions(ex, plan.items.map((i) => i.ex.id), p)
        const origId = Object.keys(data.swaps).find((k) => k.startsWith(`${today}|`) && data.swaps[k] === ex.id)?.split('|')[1] ?? ex.id
        return (
          <section className="card ex" key={ex.id}>
            <div className="row">
              <div><span className="tag">{idx + 1}. {ex.muscle}{ex.key ? ' · key lift' : ''}</span><h2 style={{ marginTop: 6 }}>{ex.name}</h2></div>
            </div>
            <div className="small mute">{sets} × {ex.reps[0]}–{ex.reps[1]} reps · rest {Math.round(ex.rest / 60 * 10) / 10} min{swapped ? ' · swapped' : ''}</div>
            <div className="small mute">{ex.note}</div>
            <div className={`rec ${rec.action}`}>
              <div className="row"><b>{rec.last ? `Last time: ${rec.last.sets.map((s) => `${s.weight}×${s.reps}`).join(', ')}` : 'First time logging this lift'}</b><span className={`tag ${TAG[rec.action]}`}>{LABEL[rec.action]}</span></div>
              <div>{rec.text}{rec.weight ? ` Target: ${rec.weight} lb.` : ''}</div>
            </div>
            <div className="sets">
              <div className="sethead"><span /><span>lb</span><span>reps</span><span>RPE</span></div>
              {rows.map((r, i) => (
                <div className="setrow" key={i}>
                  <span className="n">{i + 1}</span>
                  <input inputMode="decimal" value={r.weight} onChange={(e) => edit(ex.id, rows, i, 'weight', e.target.value)} placeholder="0" />
                  <input inputMode="numeric" value={r.reps} onChange={(e) => edit(ex.id, rows, i, 'reps', e.target.value)} placeholder={String(ex.reps[1])} />
                  <input inputMode="decimal" value={r.rpe} onChange={(e) => edit(ex.id, rows, i, 'rpe', e.target.value)} placeholder="8" />
                </div>
              ))}
            </div>
            <input value={draft.notes[ex.id] ?? ''} onChange={(e) => setDraft((dr) => ({ ...dr, notes: { ...dr.notes, [ex.id]: e.target.value } }))} placeholder="Notes" />
            <div className="row">
              <button className="ghost small-btn" onClick={() => addSet(ex.id, rows)}>+ Add set</button>
              {opts.length > 0 && <button className="ghost small-btn" onClick={() => swap(origId, ex.id, opts[0].id)}>Swap → {opts[0].name}</button>}
            </div>
          </section>
        )
      })}

      {cardio && <section className="card"><h3>Optional cardio finisher</h3><p>{cardio}</p><Link className="btn ghost" to="/log">Log cardio</Link></section>}

      <div className="sticky-cta">
        <button className="good full" onClick={finish} disabled={saved}>{saved ? '✓ Saved. Nice work.' : 'Finish workout'}</button>
      </div>
    </>
  )
}
