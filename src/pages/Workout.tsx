import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../store'
import { useCheckin } from '../actions'
import { ConfirmSheet, Sheet, WorkoutClock } from '../components'
import { SPLIT, WARMUP } from '../data'
import { addableExercises, cardioFinisher, dayTypeFor, emptySets, fmtRest, generateWorkout, recommend, restFor, swapOptions, todayISO } from '../engine'
import { imgUrl, mediaFor } from '../exerciseMedia'
import { useRestTimer } from '../RestTimer'
import type { AppData, DayType, LogEntry, SetEntry } from '../types'

const LABEL = { add_weight: 'ADD WEIGHT', add_reps: 'ADD REPS', repeat: 'REPEAT', start: 'FIND YOUR WEIGHT' } as const
const TAG = { add_weight: 'ok', add_reps: 'warn', repeat: 'accent', start: '' } as const
const DAYS: DayType[] = [...SPLIT, 'Rest/Cardio']
const FOCUS: Record<DayType, string> = {
  Push: 'Chest · Shoulders · Triceps', Pull: 'Back · Biceps · Rear delts', Legs: 'Quads · Hamstrings · Glutes · Calves',
  'Shoulders/Abs': 'Delts · Traps · Abs', 'Full Body': 'Head to toe', 'Rest/Cardio': 'Recovery & cardio',
}
const RPE_HINT: Record<number, string> = { 6: 'Easy: 4+ reps left', 7: '3 reps left', 8: '2 reps left', 9: '1 rep left', 10: 'Max: nothing left' }

function ExPhotos({ id }: { id: string }) {
  const m = mediaFor(id)
  if (!m) return null
  return (
    <div className="exphotos">
      {Array.from({ length: m.n }, (_, i) => (
        <img key={i} src={imgUrl(m.slug, i)} alt={`${m.name}, position ${i + 1}`} loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
      ))}
    </div>
  )
}
function Thumb({ id }: { id: string }) {
  const m = mediaFor(id)
  return m ? <img src={imgUrl(m.slug, 0)} alt="" loading="lazy" /> : <span />
}

/** Swipeable picker shown before the workout starts: pick today's workout, then start. */
function Chooser({ data, today, short, suggested, current, onStart, onShort }: {
  data: AppData; today: string; short: boolean; suggested: DayType; current: DayType
  onStart: (d: DayType) => void; onShort: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [sel, setSel] = useState(Math.max(0, DAYS.indexOf(current)))
  const previews = DAYS.map((day) => ({ day, items: generateWorkout(today, data, short, day).items }))
  const place = (i: number, smooth: boolean) => {
    const el = ref.current, c = el?.children[i] as HTMLElement | undefined
    if (el && c) el.scrollTo({ left: c.offsetLeft - (el.clientWidth - c.offsetWidth) / 2, behavior: smooth ? 'smooth' : ('instant' as ScrollBehavior) })
  }
  useEffect(() => { place(sel, false) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const onScroll = () => {
    const el = ref.current
    if (!el) return
    const mid = el.scrollLeft + el.clientWidth / 2
    let best = 0, bd = Infinity
    Array.from(el.children).forEach((c, i) => { const ch = c as HTMLElement; const d = Math.abs(ch.offsetLeft + ch.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = i } })
    if (best !== sel) setSel(best)
  }
  const day = DAYS[sel]
  return (
    <>
      <div><h1>Today’s workout</h1><p className="mute">Swipe to pick a different one, then start.</p></div>
      <div className="carousel" ref={ref} onScroll={onScroll}>
        {previews.map(({ day: d, items }, i) => {
          const mins = Math.round(items.reduce((a, it) => a + it.sets * (restFor(it.ex, data.settings.rest) + 40), 0) / 60 / 5) * 5
          return (
            <div key={d} className={`daycard ${i === sel ? 'sel' : ''}`} onClick={() => i !== sel && place(i, true)}>
              <div className="row"><h2>{d}</h2>{d === suggested && <span className="tag ok">Suggested</span>}</div>
              <p className="small mute">{FOCUS[d]}</p>
              {items.length ? (
                <>
                  <div className="small mute">{items.length} exercises · about {mins} min</div>
                  <div className="thumbs">{items.slice(0, 5).map((it) => <Thumb key={it.ex.id} id={it.ex.id} />)}</div>
                  <ol className="mini">{items.map((it) => <li key={it.ex.id}>{it.ex.name}</li>)}</ol>
                </>
              ) : <p className="small">Walk, bike, or stairs. Easy day to move and recover.</p>}
            </div>
          )
        })}
      </div>
      <div className="dots" role="tablist" aria-label="Choose workout">
        {DAYS.map((d, i) => <button key={d} className={`dot ${i === sel ? 'on' : ''}`} aria-label={d} onClick={() => place(i, true)} />)}
      </div>
      {day === 'Rest/Cardio'
        ? <Link className="btn primary" to="/log">Log cardio</Link>
        : <button className="primary" onClick={() => onStart(day)}>▶ Start {day}</button>}
      {day !== 'Rest/Cardio' && <button className={`chip ${short ? 'on' : ''}`} style={{ justifySelf: 'center' }} onClick={onShort}>{short ? '✓ Short on time / fatigued' : 'Short on time or fatigued?'}</button>}
    </>
  )
}

export default function Workout() {
  const { data, update } = useApp()
  const ci = useCheckin()
  const timer = useRestTimer()
  const nav = useNavigate()
  const p = data.profile!
  const today = todayISO()
  const short = !!data.short[today]
  const suggested = dayTypeFor(today, p, data.logs)
  const plan = generateWorkout(today, data, short)
  const draft = data.drafts[today] ?? { sets: {}, notes: {} }
  const todaysLog = data.logs.find((l) => l.date === today && !l.baseline)
  const started = data.started[today]
  const hasEntered = Object.values(draft.sets).some((rows) => rows.some((r) => r.reps))
  const active = (!!started || !!todaysLog || hasEntered) && plan.day !== 'Rest/Cardio'
  const items = plan.items
  const planIds = items.map((i) => i.ex.id)
  const cardio = cardioFinisher(p, plan.day)

  const [idx, setIdx] = useState(0)
  const dir = useRef(1)
  const touch = useRef<{ x: number; y: number } | null>(null)
  const [saved, setSaved] = useState(false)
  const [ask, setAsk] = useState<null | 'discard' | 'delete'>(null)
  const [sheet, setSheet] = useState<null | { kind: 'day' } | { kind: 'swap'; orig: string; cur: string } | { kind: 'add' } | { kind: 'rpe' }>(null)
  const [addDay, setAddDay] = useState<DayType | 'All'>('All')
  const [sp, setSp] = useSearchParams()
  useEffect(() => { if (sp.get('change')) { if (active) setSheet({ kind: 'day' }); setSp({}, { replace: true }) } }, [sp, setSp, active])

  const pageCount = items.length + 2 // warm-up, exercises, finish
  const page = Math.min(idx, pageCount - 1)
  const go = (n: number) => {
    const t = Math.max(0, Math.min(pageCount - 1, n))
    dir.current = t >= page ? 1 : -1
    setIdx(t)
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }

  // ---- data helpers ----
  const stripToday = <T,>(o: Record<string, T>) => Object.fromEntries(Object.entries(o).filter(([k]) => k !== today && !k.startsWith(`${today}|`)))
  const setDraft = (fn: (d: typeof draft) => typeof draft) =>
    update((d) => ({ ...d, drafts: { ...d.drafts, [today]: fn(d.drafts[today] ?? { sets: {}, notes: {} }) } }))
  const edit = (exId: string, base: SetEntry[], i: number, k: keyof SetEntry, v: string) =>
    setDraft((dr) => ({ ...dr, sets: { ...dr.sets, [exId]: (dr.sets[exId] ?? base).map((r, j) => (j === i ? { ...r, [k]: v } : r)) } }))
  const addSet = (exId: string, base: SetEntry[]) =>
    setDraft((dr) => { const rows = dr.sets[exId] ?? base; return { ...dr, sets: { ...dr.sets, [exId]: [...rows, { ...rows[rows.length - 1], reps: '', rpe: '' }] } } })
  const dropSet = (exId: string, base: SetEntry[], i: number) =>
    setDraft((dr) => { const rows = (dr.sets[exId] ?? base).filter((_, j) => j !== i); return { ...dr, sets: { ...dr.sets, [exId]: rows.length ? rows : base.slice(0, 1) } } })

  const baseFor = (exId: string, nSets: number, weight: number | null): SetEntry[] => {
    const logged = todaysLog?.entries.find((e) => e.exId === exId)
    return logged ? logged.sets.map((s) => ({ weight: String(s.weight), reps: String(s.reps), rpe: s.rpe ? String(s.rpe) : '' })) : emptySets(nSets, weight)
  }
  const exState = items.map((it) => {
    const rec = recommend(it.ex, data.logs.filter((l) => l.date !== today), today)
    const base = baseFor(it.ex.id, it.sets, rec.weight)
    const rows = draft.sets[it.ex.id] ?? base
    return { rec, base, rows, done: rows.length > 0 && rows.every((r) => r.reps) }
  })

  const beginWith = (day: DayType) => {
    update((d) => {
      const next = { ...d, extras: stripToday(d.extras), removed: stripToday(d.removed), swaps: stripToday(d.swaps), drafts: stripToday(d.drafts) }
      if (day === dayTypeFor(today, d.profile!, d.logs)) { const { [today]: _x, ...rest } = d.dayOverride; void _x; return { ...next, dayOverride: rest } }
      return { ...next, dayOverride: { ...d.dayOverride, [today]: day } }
    })
    setIdx(0)
    ci.start()
  }
  const chooseDay = (day: DayType) => {
    if (hasEntered && !confirm(`Switch to ${day}? The sets you entered for today will be cleared.`)) return
    update((d) => ({ ...d, dayOverride: { ...d.dayOverride, [today]: day }, extras: stripToday(d.extras), removed: stripToday(d.removed), swaps: stripToday(d.swaps), drafts: stripToday(d.drafts) }))
    setSheet(null); setIdx(0)
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
    setSheet(null); go(items.length + 1)
  }
  const wipeToday = (d: AppData): AppData => ({ ...d, drafts: stripToday(d.drafts), started: stripToday(d.started), extras: stripToday(d.extras), removed: stripToday(d.removed), swaps: stripToday(d.swaps), dayOverride: stripToday(d.dayOverride), short: stripToday(d.short) })
  const discard = () => { update(wipeToday); ci.reset(); setAsk(null); nav('/') }
  const deleteLogged = () => { update((d) => ({ ...wipeToday(d), logs: d.logs.filter((l) => !(l.date === today && !l.baseline)) })); ci.reset(); setAsk(null); nav('/') }

  const finish = () => {
    const entries: LogEntry[] = items.map(({ ex }) => {
      const logged = todaysLog?.entries.find((e) => e.exId === ex.id)
      const rpeStr = draft.rpe?.[ex.id] ?? (logged ? String(logged.sets[logged.sets.length - 1]?.rpe ?? '') : '')
      const sets = (draft.sets[ex.id] ?? exState[items.findIndex((i) => i.ex.id === ex.id)].rows)
        .filter((r) => r.weight !== '' && Number(r.weight) >= 0 && Number(r.reps) > 0)
        .map((r) => ({ weight: Number(r.weight), reps: Number(r.reps), rpe: undefined as number | undefined }))
      if (data.settings.rpeEnabled && rpeStr && sets.length) sets[sets.length - 1].rpe = Number(rpeStr)
      return { exId: ex.id, name: ex.name, sets, note: draft.notes[ex.id] ?? logged?.note ?? '' }
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

  // ---------- before the workout starts ----------
  if (!active) {
    return (
      <Chooser data={data} today={today} short={short} suggested={suggested} current={plan.day}
        onStart={beginWith} onShort={() => update((d) => ({ ...d, short: { ...d.short, [today]: !short } }))} />
    )
  }

  // ---------- guided workout ----------
  const onTouchStart = (e: React.TouchEvent) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY } }
  const onTouchEnd = (e: React.TouchEvent) => {
    const t = touch.current; touch.current = null
    if (!t) return
    const dx = e.changedTouches[0].clientX - t.x, dy = e.changedTouches[0].clientY - t.y
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6) go(dx < 0 ? page + 1 : page - 1)
  }

  const DaySheet = sheet?.kind === 'day' && (
    <Sheet title="Change today's workout" onClose={() => setSheet(null)}>
      <p className="small mute">Your split will continue from whatever you finish today.</p>
      <div className="chips">{DAYS.map((d) => <button key={d} className={`chip ${plan.day === d ? 'on' : ''}`} onClick={() => chooseDay(d)}>{d}</button>)}</div>
    </Sheet>
  )

  const ex = page >= 1 && page <= items.length ? items[page - 1] : null
  const st = ex ? exState[page - 1] : null

  return (
    <>
      <div className="row"><div><h1>{plan.day}</h1><p className="mute small">{short ? 'Short version' : 'Full session'}{todaysLog ? ' · logged' : ''}</p></div></div>
      {started && !todaysLog ? <div style={{ position: 'sticky', top: 6, zIndex: 6 }}><WorkoutClock since={started} compact /></div> : null}
      <div className="dots" role="tablist" aria-label="Workout progress">
        {Array.from({ length: pageCount }, (_, i) => {
          const done = i >= 1 && i <= items.length && exState[i - 1].done
          return <button key={i} className={`dot ${i === page ? 'on' : ''} ${done ? 'done' : ''}`} aria-label={i === 0 ? 'Warm-up' : i === pageCount - 1 ? 'Finish' : items[i - 1].ex.name} onClick={() => go(i)} />
        })}
      </div>

      <div key={page} className={dir.current >= 0 ? 'pg-r' : 'pg-l'} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={{ display: 'grid', gap: 14 }}>
        {page === 0 && (
          <>
            <section className="card">
              <h2>Warm-up</h2>
              <ol className="steps">{WARMUP[plan.day].map((w) => <li className="step" key={w}>{w}</li>)}</ol>
            </section>
            <section className="card">
              <h3>Today’s lifts</h3>
              {items.map((it, i) => (
                <button key={it.ex.id} className="minirow" onClick={() => go(i + 1)}>
                  <span className="thumbs"><Thumb id={it.ex.id} /></span>
                  <span style={{ flex: 1, textAlign: 'left' }}><b>{it.ex.name}</b><br /><span className="small mute">{it.sets} × {it.ex.reps[0]}–{it.ex.reps[1]}</span></span>
                  <span className={`tag ${exState[i].done ? 'ok' : ''}`}>{exState[i].done ? 'Done' : '›'}</span>
                </button>
              ))}
              <div className="row wrap">
                <button className="chip" onClick={() => setSheet({ kind: 'day' })}>↔ Change workout</button>
                <button className={`chip ${short ? 'on' : ''}`} onClick={() => update((d) => ({ ...d, short: { ...d.short, [today]: !short } }))}>{short ? '✓ Short / fatigued' : 'Short on time?'}</button>
              </div>
            </section>
          </>
        )}

        {ex && st && (
          <section className="card ex">
            <ExPhotos id={ex.ex.id} />
            <div>
              <span className="tag">{page} of {items.length} · {ex.ex.muscle}{ex.ex.key ? ' · key lift' : ''}</span>
              <h2 style={{ marginTop: 6 }}>{ex.ex.name}</h2>
              <div className="small mute">{ex.sets} × {ex.ex.reps[0]}–{ex.ex.reps[1]} reps · rest {fmtRest(restFor(ex.ex, data.settings.rest))}{ex.swapped ? ' · swapped' : ''}</div>
            </div>
            {(() => {
              const m = mediaFor(ex.ex.id)
              return (
                <details>
                  <summary style={{ cursor: 'pointer', fontWeight: 800 }}>How to do it</summary>
                  <p className="small" style={{ margin: '8px 0 4px' }}>{ex.ex.note}</p>
                  {m && <ol className="small" style={{ paddingLeft: 18, margin: 0, display: 'grid', gap: 6 }}>{m.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>}
                  {m && m.primary.length > 0 && <p className="small mute" style={{ marginTop: 8 }}>Works: {m.primary.join(', ')}{m.secondary.length ? ` · also ${m.secondary.join(', ')}` : ''}</p>}
                </details>
              )
            })()}
            <div className={`rec ${st.rec.action}`}>
              <div className="row"><b>{st.rec.last ? `Last time: ${st.rec.last.sets.map((s) => `${s.weight}×${s.reps}`).join(', ')}` : 'First time logging this lift'}</b><span className={`tag ${TAG[st.rec.action]}`}>{LABEL[st.rec.action]}</span></div>
              <div>{st.rec.text}{st.rec.weight ? ` Target: ${st.rec.weight} lb.` : ''}</div>
            </div>

            <div className="sets">
              <div className="setrow4 sethead"><span /><span>lb</span><span>reps</span><span /></div>
              {st.rows.map((r, i) => (
                <div className="setrow4" key={i}>
                  <span className="n">{i + 1}</span>
                  <input inputMode="decimal" value={r.weight} onChange={(e) => edit(ex.ex.id, st.base, i, 'weight', e.target.value)} placeholder="lb" />
                  <input inputMode="numeric" value={r.reps} onChange={(e) => { if (!r.reps && e.target.value && data.settings.autoTimer) timer.start(restFor(ex.ex, data.settings.rest), ex.ex.name); edit(ex.ex.id, st.base, i, 'reps', e.target.value) }} placeholder={String(ex.ex.reps[1])} />
                  <button className="x" aria-label={`Delete set ${i + 1}`} onClick={() => dropSet(ex.ex.id, st.base, i)}>✕</button>
                </div>
              ))}
            </div>
            <div className="row wrap">
              <button className="ghost small-btn" onClick={() => addSet(ex.ex.id, st.base)}>+ Add set</button>
              <button className="ghost small-btn" onClick={() => timer.start(restFor(ex.ex, data.settings.rest), ex.ex.name)}>⏱ Rest</button>
            </div>

            {data.settings.rpeEnabled && st.rows.length > 0 && st.rows[st.rows.length - 1].reps && (
              <div className="rec start">
                <div className="row"><b>How hard was your last set?</b><button className="ghost small-btn" onClick={() => setSheet({ kind: 'rpe' })}>ⓘ What’s RPE?</button></div>
                {(() => {
                  const logged = todaysLog?.entries.find((e) => e.exId === ex.ex.id)
                  const cur = draft.rpe?.[ex.ex.id] ?? (logged?.sets[logged.sets.length - 1]?.rpe ? String(logged.sets[logged.sets.length - 1].rpe) : '')
                  return (
                    <>
                      <div className="chips">{[6, 7, 8, 9, 10].map((n) => <button key={n} className={`chip ${cur === String(n) ? 'on' : ''}`} onClick={() => setDraft((dr) => ({ ...dr, rpe: { ...dr.rpe, [ex.ex.id]: cur === String(n) ? '' : String(n) } }))}>{n === 6 ? '≤6' : n}</button>)}</div>
                      <span className="small mute">{cur ? RPE_HINT[Number(cur)] : 'Optional. Tap one.'}</span>
                    </>
                  )
                })()}
              </div>
            )}

            <input value={draft.notes[ex.ex.id] ?? todaysLog?.entries.find((e) => e.exId === ex.ex.id)?.note ?? ''} onChange={(e) => setDraft((dr) => ({ ...dr, notes: { ...dr.notes, [ex.ex.id]: e.target.value } }))} placeholder="Notes" />
            <div className="row wrap">
              <button className="ghost small-btn" onClick={() => setSheet({ kind: 'swap', orig: ex.orig, cur: ex.ex.id })}>Swap exercise</button>
              <button className="ghost small-btn" onClick={() => removeEx(ex.orig, ex.ex.id)}>Remove</button>
            </div>
          </section>
        )}

        {page === pageCount - 1 && (
          <>
            <section className="card hero">
              <h2>{exState.filter((s) => s.done).length} of {items.length} exercises done</h2>
              {items.map((it, i) => (
                <button key={it.ex.id} className="minirow" onClick={() => go(i + 1)}>
                  <span style={{ flex: 1, textAlign: 'left' }}>{it.ex.name}</span>
                  <span className={`tag ${exState[i].done ? 'ok' : 'warn'}`}>{exState[i].done ? 'Done' : 'Not logged'}</span>
                </button>
              ))}
              <button className="ghost" onClick={() => setSheet({ kind: 'add' })}>＋ Add an exercise</button>
            </section>
            {cardio && <section className="card"><h3>Optional cardio finisher</h3><p>{cardio}</p><Link className="btn ghost" to="/log">Log cardio</Link></section>}
            <button className="link-danger" onClick={() => setAsk(todaysLog ? 'delete' : 'discard')}>{todaysLog ? '🗑 Delete this workout' : 'Discard this workout'}</button>
          </>
        )}
      </div>

      <div className="navbar">
        <button className="ghost" onClick={() => go(page - 1)} disabled={page === 0}>‹ Back</button>
        {page === pageCount - 1
          ? <button className="good" onClick={finish} disabled={saved}>{saved ? '✓ Saved. Nice work.' : todaysLog ? 'Save changes' : 'Finish workout'}</button>
          : <button className="primary" onClick={() => go(page + 1)}>{page === 0 ? 'Start lifting ›' : 'Next ›'}</button>}
      </div>

      {ask === 'discard' && <ConfirmSheet title="Discard this workout?" message="Are you sure you want to discard this workout? The sets you entered and the workout timer will be cleared." confirmLabel="Yes, discard it" onConfirm={discard} onCancel={() => setAsk(null)} />}
      {ask === 'delete' && <ConfirmSheet title="Delete this workout?" message="Are you sure you want to delete this workout? It will be removed from your history and today's check-in will be undone. This can't be undone." confirmLabel="Yes, delete it" onConfirm={deleteLogged} onCancel={() => setAsk(null)} />}
      {DaySheet}
      {sheet?.kind === 'rpe' && (
        <Sheet title="What is RPE?" onClose={() => setSheet(null)} z={50}>
          <p>RPE is <b>how hard your last set felt</b>, from 1 to 10. It tells Will Power when to add weight.</p>
          <div className="people">
            {[[10, 'Max effort. You couldn’t do another rep.'], [9, 'Very hard. 1 more rep left.'], [8, 'Hard but controlled. 2 reps left.'], [7, 'Moderate. 3 reps left.'], ['≤6', 'Easy. 4+ reps left.']].map(([n, t]) => (
              <div className="person" key={String(n)}><span className="avatar">{n}</span><span className="grow small">{t}</span></div>
            ))}
          </div>
          <p className="small mute">Aim for 8 to 9 on your working sets. Rate only the <b>last set</b> of each exercise. You can turn this off in Settings.</p>
        </Sheet>
      )}
      {sheet?.kind === 'swap' && (() => {
        const cur = items.find((i) => i.ex.id === sheet.cur)?.ex
        const opts = cur ? swapOptions(cur, planIds, p) : []
        return (
          <Sheet title={`Swap ${cur?.name ?? ''}`} onClose={() => setSheet(null)}>
            {opts.length === 0 && <p className="mute">No other options match your equipment.</p>}
            {opts.map((o) => (
              <button key={o.id} className="minirow" onClick={() => swapTo(sheet.orig, sheet.cur, o.id)}>
                <span className="thumbs"><Thumb id={o.id} /></span>
                <span style={{ flex: 1, textAlign: 'left' }}><b>{o.name}</b><br /><span className="small mute">{o.muscle} · {o.reps[0]}–{o.reps[1]} reps</span></span>
              </button>
            ))}
          </Sheet>
        )
      })()}
      {sheet?.kind === 'add' && (
        <Sheet title="Add an exercise" onClose={() => setSheet(null)}>
          <div className="chips">{(['All', ...SPLIT] as const).map((d) => <button key={d} className={`chip ${addDay === d ? 'on' : ''}`} onClick={() => setAddDay(d)}>{d}</button>)}</div>
          {addableExercises(planIds, p).filter((x) => addDay === 'All' || x.day === addDay).map((o) => (
            <button key={o.id} className="minirow" onClick={() => addEx(o.id)}>
              <span className="thumbs"><Thumb id={o.id} /></span>
              <span style={{ flex: 1, textAlign: 'left' }}><b>{o.name}</b><br /><span className="small mute">{o.day} · {o.muscle}</span></span>
            </button>
          ))}
        </Sheet>
      )}
    </>
  )
}
