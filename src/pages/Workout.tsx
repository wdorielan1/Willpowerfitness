import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../store'
import { useCheckin } from '../actions'
import { Sheet, WorkoutClock } from '../components'
import { SPLIT, WARMUP } from '../data'
import { addableExercises, cardioFinisher, emptySets, fmtRest, generateWorkout, recommend, restFor, swapOptions, todayISO } from '../engine'
import { useRestTimer } from '../RestTimer'
import type { DayType, LogEntry, SetEntry } from '../types'

const LABEL = { add_weight: 'ADD WEIGHT', add_reps: 'ADD REPS', repeat: 'REPEAT', start: 'FIND YOUR WEIGHT' } as const
const TAG = { add_weight: 'ok', add_reps: 'warn', repeat: 'accent', start: '' } as const
const DAYS: DayType[] = [...SPLIT, 'Rest/Cardio']

export default function Workout() {
  const { data, update } = useApp()
  const ci = useCheckin()
  const timer = useRestTimer()
  const nav = useNavigate()
  const p = data.profile!
  const today = todayISO()
  const short = !!data.short[today]
  const plan = generateWorkout(today, data, short)
  const draft = data.drafts[today] ?? { sets: {}, notes: {} }
  const todaysLog = data.logs.find((l) => l.date === today && !l.baseline)
  const started = data.started[today]
  const [saved, setSaved] = useState(false)
  const [sheet, setSheet] = useState<null | { kind: 'day' } | { kind: 'swap'; orig: string; cur: string } | { kind: 'add' }>(null)
  const [addDay, setAddDay] = useState<DayType | 'All'>('All')
  const cardio = cardioFinisher(p, plan.day)
  const planIds = plan.items.map((i) => i.ex.id)

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
  const dropSet = (exId: string, base: SetEntry[], i: number) =>
    setDraft((dr) => {
      const rows = (dr.sets[exId] ?? base).filter((_, j) => j !== i)
      return { ...dr, sets: { ...dr.sets, [exId]: rows.length ? rows : base.slice(0, 1) } }
    })

  const begin = () => ci.start()
  const [sp, setSp] = useSearchParams()
  useEffect(() => { if (sp.get('change')) { setSheet({ kind: 'day' }); setSp({}, { replace: true }) } }, [sp, setSp])

  const chooseDay = (day: DayType) => {
    const hasWork = Object.values(draft.sets).some((rows) => rows.some((r) => r.reps))
    if (hasWork && !confirm(`Switch to ${day}? The sets you entered for today will be cleared.`)) return
    update((d) => {
      const strip = <T,>(o: Record<string, T>) => Object.fromEntries(Object.entries(o).filter(([k]) => k !== today && !k.startsWith(`${today}|`)))
      return { ...d, dayOverride: { ...d.dayOverride, [today]: day }, extras: strip(d.extras), removed: strip(d.removed), swaps: strip(d.swaps), drafts: strip(d.drafts) }
    })
    setSheet(null)
  }

  const swapTo = (orig: string, cur: string, next: string) => {
    const isExtra = (data.extras[today] ?? []).includes(cur)
    update((d) => {
      const drafts = { ...d.drafts, [today]: { ...(d.drafts[today] ?? { sets: {}, notes: {} }), sets: Object.fromEntries(Object.entries(d.drafts[today]?.sets ?? {}).filter(([k]) => k !== cur)) } }
      if (isExtra) return { ...d, extras: { ...d.extras, [today]: (d.extras[today] ?? []).map((x) => (x === cur ? next : x)) }, drafts }
      return { ...d, swaps: { ...d.swaps, [`${today}|${orig}`]: next }, drafts }
    })
    setSheet(null)
  }
  const removeEx = (orig: string, cur: string) => {
    const isExtra = (data.extras[today] ?? []).includes(cur)
    update((d) => isExtra
      ? { ...d, extras: { ...d.extras, [today]: (d.extras[today] ?? []).filter((x) => x !== cur) } }
      : { ...d, removed: { ...d.removed, [today]: [...(d.removed[today] ?? []), orig] } })
  }
  const addEx = (id: string) => {
    update((d) => ({ ...d, extras: { ...d.extras, [today]: [...(d.extras[today] ?? []), id] }, removed: { ...d.removed, [today]: (d.removed[today] ?? []).filter((x) => x !== id) } }))
    setSheet(null)
  }

  const finish = () => {
    const entries: LogEntry[] = plan.items.map(({ ex }) => {
      const rows = draft.sets[ex.id] ?? []
      const sets = rows
        .filter((r) => r.weight !== '' && Number(r.weight) >= 0 && Number(r.reps) > 0)
        .map((r) => ({ weight: Number(r.weight), reps: Number(r.reps), rpe: r.rpe ? Number(r.rpe) : undefined }))
      return { exId: ex.id, name: ex.name, sets, note: draft.notes[ex.id] ?? '' }
    }).filter((x) => x.sets.length)
    update((d) => {
      const { [today]: _gone, ...drafts } = d.drafts
      void _gone
      return {
        ...d, drafts,
        logs: [...d.logs.filter((l) => !(l.date === today && !l.baseline)), { date: today, dayType: plan.day, short, entries, minutes: started ? Math.max(1, Math.round(Math.min(Date.now() - started, d.settings.maxWorkoutHours * 3600000) / 60000)) : undefined }],
        checkins: { ...d.checkins, [today]: { going: true, done: true } },
      }
    })
    setSaved(true)
    setTimeout(() => nav('/'), 900)
  }

  const DaySheet = sheet?.kind === 'day' && (
    <Sheet title="Change today's workout" onClose={() => setSheet(null)}>
      <p className="small mute">Your split will continue from whatever you finish today.</p>
      <div className="chips">{DAYS.map((d) => <button key={d} className={`chip ${plan.day === d ? 'on' : ''}`} onClick={() => chooseDay(d)}>{d}</button>)}</div>
      {data.dayOverride[today] && <button className="ghost" onClick={() => update((d) => { const { [today]: _x, ...rest } = d.dayOverride; void _x; return { ...d, dayOverride: rest } })}>Back to the suggested workout</button>}
    </Sheet>
  )

  if (plan.day === 'Rest/Cardio') {
    return (
      <>
        <div className="row"><div><h1>Rest / cardio</h1><p className="mute">Recovery is part of the plan. Move, don’t grind.</p></div></div>
        <button className="ghost" onClick={() => setSheet({ kind: 'day' })}>Switch today’s workout</button>
        <section className="card hero">
          <h2>Today’s cardio</h2>
          <p>{cardio ?? 'Optional walk or mobility. Cardio is off in your profile.'}</p>
          <Link className="btn primary" to="/log">Log cardio</Link>
        </section>
        {DaySheet}
      </>
    )
  }

  return (
    <>
      <div className="row">
        <div><h1>{plan.day}</h1><p className="mute">{short ? 'Short version · ~30 min' : 'Full session'} · {plan.items.length} exercises{todaysLog ? ' · logged' : ''}</p></div>
      </div>
      {started && !todaysLog ? <div style={{ position: 'sticky', top: 6, zIndex: 6 }}><WorkoutClock since={started} compact /></div> : null}

      {!started && !todaysLog && <button className="primary" onClick={begin}>▶ Start workout</button>}
      <div className="row wrap">
        <button className="chip" onClick={() => setSheet({ kind: 'day' })}>↔ Change workout</button>
        <button className={`chip ${short ? 'on' : ''}`} onClick={() => update((d) => ({ ...d, short: { ...d.short, [today]: !short } }))}>
          {short ? '✓ Short / fatigued' : 'Short on time?'}
        </button>
      </div>

      <details className="card">
        <summary style={{ fontWeight: 800, cursor: 'pointer' }}>Warm-up</summary>
        <ol className="steps" style={{ marginTop: 10 }}>{WARMUP[plan.day].map((w) => <li className="step" key={w}>{w}</li>)}</ol>
      </details>

      {plan.items.map(({ ex, sets, swapped, orig }, idx) => {
        const rec = recommend(ex, data.logs.filter((l) => l.date !== today), today)
        const logged = todaysLog?.entries.find((e) => e.exId === ex.id)
        const base: SetEntry[] = logged
          ? logged.sets.map((s) => ({ weight: String(s.weight), reps: String(s.reps), rpe: s.rpe ? String(s.rpe) : '' }))
          : emptySets(sets, rec.weight)
        const rows = draft.sets[ex.id] ?? base
        return (
          <section className="card ex" key={ex.id}>
            <div className="row">
              <div><span className="tag">{idx + 1}. {ex.muscle}{ex.key ? ' · key lift' : ''}</span><h2 style={{ marginTop: 6 }}>{ex.name}</h2></div>
            </div>
            <div className="small mute">{sets} × {ex.reps[0]}–{ex.reps[1]} reps · rest {fmtRest(restFor(ex, data.settings.rest))}{swapped ? ' · swapped' : ''}</div>
            <div className="small mute">{ex.note}</div>
            <div className={`rec ${rec.action}`}>
              <div className="row"><b>{rec.last ? `Last time: ${rec.last.sets.map((s) => `${s.weight}×${s.reps}`).join(', ')}` : 'First time logging this lift'}</b><span className={`tag ${TAG[rec.action]}`}>{LABEL[rec.action]}</span></div>
              <div>{rec.text}{rec.weight ? ` Target: ${rec.weight} lb.` : ''}</div>
            </div>
            <div className="sets">
              <div className="sethead"><span /><span>lb</span><span>reps</span><span>RPE</span></div>
              {rows.map((r, i) => (
                <div className="setrow" key={i}>
                  <button className="n" style={{ background: 'transparent', minHeight: 0, padding: 0, color: 'var(--mute)' }} title="Remove set" onClick={() => dropSet(ex.id, base, i)}>{i + 1}</button>
                  <input inputMode="decimal" value={r.weight} onChange={(e) => edit(ex.id, base, i, 'weight', e.target.value)} placeholder="lb" />
                  <input inputMode="numeric" value={r.reps} onChange={(e) => { if (!r.reps && e.target.value && data.settings.autoTimer) timer.start(restFor(ex, data.settings.rest), ex.name); edit(ex.id, base, i, 'reps', e.target.value) }} placeholder={String(ex.reps[1])} />
                  <input inputMode="decimal" value={r.rpe} onChange={(e) => edit(ex.id, base, i, 'rpe', e.target.value)} placeholder="8" />
                </div>
              ))}
            </div>
            <input value={draft.notes[ex.id] ?? logged?.note ?? ''} onChange={(e) => setDraft((dr) => ({ ...dr, notes: { ...dr.notes, [ex.id]: e.target.value } }))} placeholder="Notes" />
            <div className="row wrap">
              <button className="ghost small-btn" onClick={() => timer.start(restFor(ex, data.settings.rest), ex.name)}>⏱ Rest</button>
              <button className="ghost small-btn" onClick={() => addSet(ex.id, base)}>+ Set</button>
              <button className="ghost small-btn" onClick={() => setSheet({ kind: 'swap', orig, cur: ex.id })}>Swap</button>
              <button className="ghost small-btn" onClick={() => removeEx(orig, ex.id)}>Remove</button>
            </div>
          </section>
        )
      })}

      <button className="ghost" onClick={() => setSheet({ kind: 'add' })}>＋ Add an exercise</button>

      {cardio && <section className="card"><h3>Optional cardio finisher</h3><p>{cardio}</p><Link className="btn ghost" to="/log">Log cardio</Link></section>}

      <div className="sticky-cta">
        <button className="good full" onClick={finish} disabled={saved}>{saved ? '✓ Saved. Nice work.' : todaysLog ? 'Save changes' : 'Finish workout'}</button>
      </div>

      {DaySheet}
      {sheet?.kind === 'swap' && (() => {
        const cur = plan.items.find((i) => i.ex.id === sheet.cur)?.ex
        const opts = cur ? swapOptions(cur, planIds, p) : []
        return (
          <Sheet title={`Swap ${cur?.name ?? ''}`} onClose={() => setSheet(null)}>
            {opts.length === 0 && <p className="mute">No other options match your equipment.</p>}
            {opts.map((o) => (
              <button key={o.id} className="row full" style={{ textAlign: 'left' }} onClick={() => swapTo(sheet.orig, sheet.cur, o.id)}>
                <span><b>{o.name}</b><br /><span className="small mute">{o.muscle} · {o.reps[0]}–{o.reps[1]} reps</span></span>
              </button>
            ))}
          </Sheet>
        )
      })()}
      {sheet?.kind === 'add' && (
        <Sheet title="Add an exercise" onClose={() => setSheet(null)}>
          <div className="chips">{(['All', ...SPLIT] as const).map((d) => <button key={d} className={`chip ${addDay === d ? 'on' : ''}`} onClick={() => setAddDay(d)}>{d}</button>)}</div>
          {addableExercises(planIds, p).filter((x) => addDay === 'All' || x.day === addDay).map((o) => (
            <button key={o.id} className="row full" style={{ textAlign: 'left' }} onClick={() => addEx(o.id)}>
              <span><b>{o.name}</b><br /><span className="small mute">{o.day} · {o.muscle}</span></span>
            </button>
          ))}
        </Sheet>
      )}
    </>
  )
}
