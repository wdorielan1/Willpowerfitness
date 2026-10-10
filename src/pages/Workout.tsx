import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../store'
import { useCheckin } from '../actions'
import { ConfirmSheet, fmtClock, Lightbox, Sheet } from '../components'
import { SPLIT, WARMUP } from '../data'
import { addableExercises, cardioFinisher, dayTypeFor, emptySets, fmtRest, fromISO, generateWorkout, recommend, restFor, swapOptions, todayISO, weekSchedule, type WeekDay } from '../engine'
import { imgUrl, mediaFor } from '../exerciseMedia'
import { useRestTimer } from '../RestTimer'
import { usePostActions } from './Feed'
import { Icon } from '../icons'
import type { AppData, DayType, Draft, LogEntry, SetEntry } from '../types'

const ABBR: Record<DayType, string> = { Push: 'Push', Pull: 'Pull', Legs: 'Legs', 'Shoulders/Abs': 'Sh/Abs', 'Full Body': 'Full', 'Rest/Cardio': 'Rest' }

const validSet = (row: SetEntry) => row.weight.trim() !== '' && row.reps.trim() !== ''
  && Number.isFinite(Number(row.weight)) && Number(row.weight) >= 0
  && Number.isFinite(Number(row.reps)) && Number(row.reps) > 0

function SessionElapsed({ since }: { since: number }) {
  const [, tick] = useState(0)
  useEffect(() => { const id = window.setInterval(() => tick((n) => n + 1), 1000); return () => window.clearInterval(id) }, [])
  return <span className="workout-elapsed" aria-label="Workout elapsed time"><Icon name="clock" />{fmtClock(Date.now() - since)}</span>
}

/** This week's lifting plan: what's done, what was missed, and how to get back on track. */
function WeekCard({ onPick }: { onPick: (d: DayType) => void }) {
  const { data, update } = useApp()
  const today = todayISO()
  const week = weekSchedule(data, today)
  const [open, setOpen] = useState<WeekDay | null>(null)
  const planned = week.filter((w) => w.status !== 'rest').length
  const done = week.filter((w) => w.status === 'done').length
  const missed = week.filter((w) => w.status === 'missed')
  const next = week.find((w) => w.status === 'today' || w.status === 'upcoming')
  const skip = (w: WeekDay) => { update((d) => ({ ...d, logs: [...d.logs, { date: w.date, dayType: w.planned, short: false, entries: [], skipped: true }].sort((a, b) => a.date.localeCompare(b.date)) })); setOpen(null) }
  const icon: Record<WeekDay['status'], string> = { done: '✓', missed: '✕', skipped: '⤼', today: '●', upcoming: '○', rest: '–' }
  const color: Record<WeekDay['status'], string> = { done: 'var(--ok)', missed: '#ff6b6b', skipped: 'var(--mute)', today: 'var(--accent)', upcoming: 'var(--mute)', rest: '#55555e' }
  const sum = (w: WeekDay) => (w.logged ? `${w.logged.entries.length} exercises · ${w.logged.entries.reduce((a, e) => a + e.sets.length, 0)} sets${w.logged.minutes ? ` · ${w.logged.minutes} min` : ''}` : '')
  return (
    <section className="card">
      <div className="row"><h3><Icon name="calendar" /> This week</h3><span className="tag">{done} of {planned} done</span></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, textAlign: 'center' }}>
        {week.map((w) => (
          <button key={w.date} onClick={() => setOpen(w)} style={{ minHeight: 64, padding: '6px 0', borderRadius: 12, background: 'var(--card2)', border: w.status === 'today' ? '2px solid var(--accent)' : '1px solid var(--line)', display: 'grid', gap: 2, justifyItems: 'center', fontSize: 11, color: 'var(--text)' }}>
            <span className="mute">{w.label}</span><b style={{ color: color[w.status], fontSize: 17 }}>{icon[w.status]}</b><span style={{ color: w.status === 'rest' ? '#55555e' : undefined }}>{ABBR[w.planned]}</span>
          </button>
        ))}
      </div>
      {missed.length > 0 && (
        <div className="rec repeat">
          <b>You missed {missed.map((m) => `${ABBR[m.planned]} (${m.label})`).join(', ')}.</b>
          <div className="small">Nothing is lost. Your plan keeps it next in line{next ? `, so ${next.status === 'today' ? 'today' : next.label} is ${ABBR[next.planned]}` : ''}. Or tap the day to make it up now or skip it.</div>
        </div>
      )}
      {open && (
        <Sheet title={`${fromISO(open.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}`} onClose={() => setOpen(null)}>
          {open.status === 'done' && <><p><b>{open.planned}</b> done ✓</p><p className="small mute">{sum(open)}</p></>}
          {open.status === 'skipped' && <p>You skipped <b>{open.planned}</b> on this day.</p>}
          {open.status === 'rest' && <p>Rest / cardio day. Recovery is part of the plan.</p>}
          {(open.status === 'today' || open.status === 'upcoming') && <><p>Planned: <b>{open.planned}</b></p><p className="small mute">{open.status === 'today' ? 'That is today.' : 'This assumes you finish the workouts before it.'}</p></>}
          {open.status === 'missed' && (
            <>
              <p>You didn’t log <b>{open.planned}</b> on this day.</p>
              <p className="small mute">How do you want to handle it?</p>
              <button className="primary" onClick={() => { onPick(open.planned); setOpen(null) }}>Do {open.planned} today</button>
              <button className="ghost" onClick={() => setOpen(null)}>Let it roll to my next workout</button>
              <button className="ghost" onClick={() => skip(open)}>Skip it and move on</button>
            </>
          )}
        </Sheet>
      )}
    </section>
  )
}

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
  const [at, setAt] = useState<number | null>(null)
  if (!m) return null
  const srcs = Array.from({ length: m.n }, (_, i) => imgUrl(m.slug, i))
  return (
    <>
      <div className="exphotos">
        {srcs.map((s, i) => (
          <img key={i} src={s} alt={`${m.name}, position ${i + 1}`} loading="lazy" onClick={() => setAt(i)} style={{ cursor: 'zoom-in' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
        ))}
      </div>
      {at !== null && <Lightbox srcs={srcs} start={at} caption={srcs.map((_, i) => `${m.name} · ${i === 0 ? 'start' : 'finish'}`)} onClose={() => setAt(null)} />}
    </>
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
      <div><div className="overline">YOUR TRAINING PLAN</div><h1>Choose your session.</h1><p className="mute">Pick a workout, then start.</p></div>
      <WeekCard onPick={(d) => { place(DAYS.indexOf(d), true); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
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
        : <button className="primary" onClick={() => onStart(day)}>Start {day}<Icon name="arrow" /></button>}
      {day !== 'Rest/Cardio' && <button className={`chip ${short ? 'on' : ''}`} style={{ justifySelf: 'center' }} onClick={onShort}>{short && <Icon name="check" />}{short ? 'Short session selected' : 'Short on time or fatigued?'}</button>}
    </>
  )
}

export default function Workout() {
  const { data, update } = useApp()
  const ci = useCheckin()
  const timer = useRestTimer()
  const { post: postToCrew } = usePostActions(data.primary ?? '')
  const nav = useNavigate()
  const p = data.profile!
  const today = todayISO()
  const short = !!data.short[today]
  const suggested = dayTypeFor(today, p, data.logs)
  const plan = generateWorkout(today, data, short)
  const draft: Draft = data.drafts[today] ?? { sets: {}, notes: {} }
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
  const [validation, setValidation] = useState('')
  const [ask, setAsk] = useState<null | 'discard' | 'delete'>(null)
  const [sheet, setSheet] = useState<null | { kind: 'day' } | { kind: 'swap'; orig: string; cur: string } | { kind: 'add' } | { kind: 'rpe' } | { kind: 'options'; exId: string }>(null)
  const [addDay, setAddDay] = useState<DayType | 'All'>('All')
  const [sp, setSp] = useSearchParams()
  useEffect(() => { if (sp.get('change')) { if (active) setSheet({ kind: 'day' }); setSp({}, { replace: true }) } }, [sp, setSp, active])

  const pageCount = items.length + 2 // warm-up, exercises, finish
  const page = Math.min(idx, pageCount - 1)
  const go = (n: number) => {
    const t = Math.max(0, Math.min(pageCount - 1, n))
    dir.current = t >= page ? 1 : -1
    setIdx(t)
    setValidation('')
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }

  // ---- data helpers ----
  const stripToday = <T,>(o: Record<string, T>) => Object.fromEntries(Object.entries(o).filter(([k]) => k !== today && !k.startsWith(`${today}|`)))
  const setDraft = (fn: (d: typeof draft) => typeof draft) =>
    update((d) => ({ ...d, drafts: { ...d.drafts, [today]: fn(d.drafts[today] ?? { sets: {}, notes: {} }) } }))
  const completionFor = (dr: Draft, exId: string, rows: SetEntry[]) => rows.map((row, i) => {
    const explicit = dr.completed?.[exId]
    if (explicit) return !!explicit[i] && validSet(row)
    // Saved workouts predate explicit set completion. Keep their logged sets checked.
    const previous = todaysLog?.entries.find((e) => e.exId === exId)?.sets[i]
    return !!previous && validSet(row) && Number(row.weight) === previous.weight && Number(row.reps) === previous.reps
  })
  const edit = (exId: string, base: SetEntry[], i: number, k: keyof SetEntry, v: string) => {
    setValidation('')
    setDraft((dr) => {
      const rows = dr.sets[exId] ?? base
      return { ...dr, sets: { ...dr.sets, [exId]: rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)) }, completed: { ...dr.completed, [exId]: completionFor(dr, exId, rows).map((done, j) => j === i ? false : done) } }
    })
  }
  const addSet = (exId: string, base: SetEntry[]) =>
    setDraft((dr) => { const rows = dr.sets[exId] ?? base; return { ...dr, sets: { ...dr.sets, [exId]: [...rows, { weight: rows[rows.length - 1]?.weight ?? '', reps: '', rpe: '' }] }, completed: { ...dr.completed, [exId]: [...completionFor(dr, exId, rows), false] } } })
  const dropSet = (exId: string, base: SetEntry[], i: number) =>
    setDraft((dr) => {
      const current = dr.sets[exId] ?? base, rows = current.filter((_, j) => j !== i)
      return { ...dr, sets: { ...dr.sets, [exId]: rows.length ? rows : [{ weight: current[0]?.weight ?? '', reps: '', rpe: '' }] }, completed: { ...dr.completed, [exId]: rows.length ? completionFor(dr, exId, current).filter((_, j) => j !== i) : [false] } }
    })
  const logSet = (exId: string, base: SetEntry[], i: number, rest: number, name: string) => {
    const rows = draft.sets[exId] ?? base
    if (!rows[i] || !validSet(rows[i])) {
      setValidation(`Set ${i + 1}: enter a weight of 0 or more and reps greater than 0.`)
      document.getElementById(`set-${exId}-${i}-${rows[i]?.weight.trim() === '' || Number(rows[i]?.weight) < 0 ? 'weight' : 'reps'}`)?.focus()
      return
    }
    if (completionFor(draft, exId, rows)[i]) return
    setValidation('')
    setDraft((dr) => ({ ...dr, sets: { ...dr.sets, [exId]: dr.sets[exId] ?? base }, completed: { ...dr.completed, [exId]: completionFor(dr, exId, dr.sets[exId] ?? base).map((done, j) => j === i || done) } }))
    if (data.settings.autoTimer) timer.start(rest, name)
  }

  const baseFor = (exId: string, nSets: number, weight: number | null): SetEntry[] => {
    const logged = todaysLog?.entries.find((e) => e.exId === exId)
    return logged ? logged.sets.map((s) => ({ weight: String(s.weight), reps: String(s.reps), rpe: s.rpe ? String(s.rpe) : '' })) : emptySets(nSets, weight)
  }
  const exState = items.map((it) => {
    const rec = recommend(it.ex, data.logs.filter((l) => l.date !== today), today)
    const base = baseFor(it.ex.id, it.sets, rec.weight)
    const rows = draft.sets[it.ex.id] ?? base
    const completed = completionFor(draft, it.ex.id, rows)
    return { rec, base, rows, completed, done: rows.length > 0 && completed.every(Boolean) }
  })

  const beginWith = (day: DayType) => {
    timer.stop()
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
    timer.stop()
    update((d) => ({ ...d, dayOverride: { ...d.dayOverride, [today]: day }, extras: stripToday(d.extras), removed: stripToday(d.removed), swaps: stripToday(d.swaps), drafts: stripToday(d.drafts) }))
    setSheet(null); setIdx(0)
  }
  const swapTo = (orig: string, cur: string, next: string) => {
    const isExtra = (data.extras[today] ?? []).includes(cur)
    update((d) => {
      const drafts = { ...d.drafts, [today]: { ...(d.drafts[today] ?? { sets: {}, notes: {} }), sets: Object.fromEntries(Object.entries(d.drafts[today]?.sets ?? {}).filter(([k]) => k !== cur)), completed: Object.fromEntries(Object.entries(d.drafts[today]?.completed ?? {}).filter(([k]) => k !== cur)) } }
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
  const discard = () => { timer.stop(); update(wipeToday); ci.reset(); setAsk(null); nav('/') }
  const deleteLogged = () => { timer.stop(); update((d) => ({ ...wipeToday(d), logs: d.logs.filter((l) => !(l.date === today && !l.baseline)) })); ci.reset(); setAsk(null); nav('/') }

  const finish = () => {
    const invalid = exState.findIndex((s) => s.rows.some((r) => r.reps.trim() !== '' && !validSet(r)))
    if (invalid >= 0) {
      go(invalid + 1)
      setValidation('Check the entered sets before finishing. Each needs a weight of 0 or more and reps greater than 0.')
      return
    }
    const entries: LogEntry[] = items.map(({ ex }) => {
      const logged = todaysLog?.entries.find((e) => e.exId === ex.id)
      const rpeStr = draft.rpe?.[ex.id] ?? (logged ? String(logged.sets[logged.sets.length - 1]?.rpe ?? '') : '')
      const sets = (draft.sets[ex.id] ?? exState[items.findIndex((i) => i.ex.id === ex.id)].rows)
        .filter(validSet)
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
    if (data.settings.autoShare && data.primary && entries.length) {
      const sets = entries.reduce((a, e) => a + e.sets.length, 0)
      const volume = Math.round(entries.reduce((a, e) => a + e.sets.reduce((s, x) => s + x.weight * x.reps, 0), 0))
      const mins = started ? Math.max(1, Math.round(Math.min(Date.now() - started, data.settings.maxWorkoutHours * 3600000) / 60000)) : 0
      void postToCrew({ kind: 'workout', text: `Finished ${plan.day}${mins ? ` in ${mins} min` : ''}`, meta: { sets, volume, exercises: entries.length } })
    }
    timer.stop()
    setSaved(true)
    setTimeout(() => nav('/'), 900)
  }

  // ---------- before the workout starts ----------
  if (!active) {
    return (
      <div className="workout-chooser"><Chooser data={data} today={today} short={short} suggested={suggested} current={plan.day}
        onStart={beginWith} onShort={() => update((d) => ({ ...d, short: { ...d.short, [today]: !short } }))} /></div>
    )
  }

  // ---------- guided workout ----------
  const onTouchStart = (e: React.TouchEvent) => { touch.current = (e.target as HTMLElement).closest('input, button, textarea, select, details') ? null : { x: e.touches[0].clientX, y: e.touches[0].clientY } }
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
  const nextSet = st ? st.completed.findIndex((done) => !done) : -1
  const enteredSets = exState.reduce((sum, s) => sum + s.rows.filter(validSet).length, 0)
  const pendingSets = exState.reduce((sum, s) => sum + s.rows.filter((row, i) => validSet(row) && !s.completed[i]).length, 0)

  return (
    <div className="workout-session">
      <header className="workout-header">
        <button className="icon-button" aria-label="Back to Today" onClick={() => nav('/')}><Icon name="back" /></button>
        <div className="workout-header-title"><b>{plan.day} session</b><span>{short ? 'Short session' : todaysLog ? 'Edit workout' : 'Training'}</span></div>
        {started && !todaysLog ? <SessionElapsed since={started} /> : <Icon name="weight" />}
      </header>
      <div className="workout-progress" role="tablist" aria-label="Workout progress">
        {Array.from({ length: pageCount }, (_, i) => {
          const done = i >= 1 && i <= items.length && exState[i - 1].done
          return <button key={i} role="tab" aria-selected={i === page} className={`${i === page ? 'on' : ''} ${done ? 'done' : ''}`} aria-label={i === 0 ? 'Warm-up' : i === pageCount - 1 ? 'Finish' : items[i - 1].ex.name} onClick={() => go(i)} />
        })}
      </div>

      <div key={page} className={`workout-page ${dir.current >= 0 ? 'pg-r' : 'pg-l'}`} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {page === 0 && (
          <>
            <section className="card workout-warmup">
              <div className="overline">BEFORE YOU LIFT</div>
              <h1>Warm up.</h1>
              <ol className="steps">{WARMUP[plan.day].map((w) => <li className="step" key={w}>{w}</li>)}</ol>
            </section>
            <section className="card">
              <h3>Today’s lifts</h3>
              {items.map((it, i) => (
                <button key={it.ex.id} className="minirow" onClick={() => go(i + 1)}>
                  <span className="thumbs"><Thumb id={it.ex.id} /></span>
                  <span style={{ flex: 1, textAlign: 'left' }}><b>{it.ex.name}</b><br /><span className="small mute">{it.sets} × {it.ex.reps[0]}–{it.ex.reps[1]}</span></span>
                  <span className={`tag ${exState[i].done ? 'ok' : ''}`}>{exState[i].done ? <Icon name="check" /> : <Icon name="chevron" />}</span>
                </button>
              ))}
              <div className="row wrap">
                <button className="chip" onClick={() => setSheet({ kind: 'day' })}>Change workout</button>
                <button className={`chip ${short ? 'on' : ''}`} onClick={() => update((d) => ({ ...d, short: { ...d.short, [today]: !short } }))}>{short && <Icon name="check" />}{short ? 'Short session' : 'Short on time?'}</button>
              </div>
            </section>
            <details className="workout-week-guide"><summary>Your weekly plan<Icon name="chevron" /></summary><WeekCard onPick={chooseDay} /></details>
          </>
        )}

        {ex && st && (
          <section className="ex workout-exercise">
            <div className="overline">EXERCISE {page} OF {items.length} · {ex.ex.muscle}{ex.ex.key ? ' · KEY LIFT' : ''}</div>
            <h1 className="exercise-title">{ex.ex.name}</h1>
            <div className="exercise-meta">
              <span><Icon name="weight" />{st.rows.length} sets · {ex.ex.reps[0]}–{ex.ex.reps[1]} reps</span>
              <span><Icon name="clock" />{fmtRest(restFor(ex.ex, data.settings.rest))} rest</span>
              {ex.swapped && <span>Swapped</span>}
            </div>
            {(() => {
              const m = mediaFor(ex.ex.id)
              return (
                <details className="exercise-guide">
                  <summary><span><Icon name="photo" />Exercise guide</span><Icon name="chevron" /></summary>
                  <div className="exercise-guide-body">
                    <ExPhotos id={ex.ex.id} />
                    <p className="small">{ex.ex.note}</p>
                    {m && <ol className="small">{m.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>}
                    {m && m.primary.length > 0 && <p className="small mute">Works: {m.primary.join(', ')}{m.secondary.length ? ` · also ${m.secondary.join(', ')}` : ''}</p>}
                  </div>
                </details>
              )
            })()}
            <div className={`exercise-recommendation ${st.rec.action}`}>
              <b>{st.rec.last ? `Last session: ${st.rec.last.sets.map((s) => `${s.weight} × ${s.reps}`).join(', ')}` : 'First session for this lift'}</b>
              <p>{st.rec.text}{st.rec.weight ? ` Target: ${st.rec.weight} lb.` : ''}</p>
              {st.rec.last && <span className={`tag ${TAG[st.rec.action]}`}>{LABEL[st.rec.action]}</span>}
            </div>

            <div className="workout-set-table">
              <div className="workout-set-head"><span>Set</span><span>Weight / lb</span><span>Reps</span><span /></div>
              {st.rows.map((r, i) => (
                <div className={`workout-set-row ${i === nextSet ? 'current' : ''} ${st.completed[i] ? 'completed' : ''}`} key={i}>
                  <span className="n">{i + 1}</span>
                  <input id={`set-${ex.ex.id}-${i}-weight`} type="number" min="0" step="any" inputMode="decimal" aria-label={`Set ${i + 1} weight`} value={r.weight} onChange={(e) => edit(ex.ex.id, st.base, i, 'weight', e.target.value)} placeholder="—" />
                  <input id={`set-${ex.ex.id}-${i}-reps`} type="number" min="1" inputMode="numeric" aria-label={`Set ${i + 1} reps`} value={r.reps} onChange={(e) => edit(ex.ex.id, st.base, i, 'reps', e.target.value)} placeholder="—" />
                  <button className={`set-check ${st.completed[i] ? 'done' : ''}`} aria-label={st.completed[i] ? `Set ${i + 1} logged` : `Log set ${i + 1}`} aria-pressed={st.completed[i]} onClick={() => logSet(ex.ex.id, st.base, i, restFor(ex.ex, data.settings.rest), ex.ex.name)}><Icon name="check" /></button>
                </div>
              ))}
            </div>
            <div className="workout-set-tools">
              <button className="quiet-button" onClick={() => addSet(ex.ex.id, st.base)}><Icon name="plus" />Add set</button>
              <button className="icon-button" aria-label="Exercise options" onClick={() => setSheet({ kind: 'options', exId: ex.ex.id })}><Icon name="more" /></button>
            </div>
            {validation && <p className="workout-validation" role="alert">{validation}</p>}

            {data.settings.rpeEnabled && st.rows.length > 0 && st.rows[st.rows.length - 1].reps && (
              <details className="workout-rpe">
                <summary>How hard was your last set?<Icon name="chevron" /></summary>
                <button className="quiet-button" onClick={() => setSheet({ kind: 'rpe' })}>What’s RPE?</button>
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
              </details>
            )}
          </section>
        )}

        {page === pageCount - 1 && (
          <>
            <section className="card workout-review">
              <div className="overline">SESSION REVIEW</div>
              <h1>Ready to finish?</h1>
              <p className="mute">{enteredSets} {enteredSets === 1 ? 'set' : 'sets'} entered · {exState.filter((s) => s.done).length} of {items.length} exercises completed</p>
              {pendingSets > 0 && <p className="banner">{pendingSets} entered {pendingSets === 1 ? 'set has' : 'sets have'} not been checked. These valid sets will also be saved when you finish.</p>}
              {items.map((it, i) => (
                <button key={it.ex.id} className="minirow" onClick={() => go(i + 1)}>
                  <span style={{ flex: 1, textAlign: 'left' }}>{it.ex.name}</span>
                  <span className={`tag ${exState[i].done ? 'ok' : ''}`}>{exState[i].rows.filter(validSet).length} sets{exState[i].done && <Icon name="check" />}</span>
                </button>
              ))}
              <button className="ghost" onClick={() => setSheet({ kind: 'add' })}><Icon name="plus" />Add an exercise</button>
            </section>
            {cardio && <section className="card"><h3>Optional cardio finisher</h3><p>{cardio}</p><Link className="btn ghost" to="/log">Log cardio</Link></section>}
            <button className="link-danger" onClick={() => setAsk(todaysLog ? 'delete' : 'discard')}>{todaysLog ? 'Delete this workout' : 'Discard this workout'}</button>
          </>
        )}
      </div>

      <footer className="workout-footer">
        {ex && st && <p>{nextSet < 0 ? 'All sets logged. Ready for the next exercise.' : data.settings.autoTimer ? 'Log a set to start your rest timer.' : 'Tap the check to log each set.'}</p>}
        {page === pageCount - 1
          ? <button className="primary" onClick={finish} disabled={saved}>{saved ? 'Workout saved' : todaysLog ? 'Save changes' : 'Finish workout'}<Icon name="check" /></button>
          : ex && st && nextSet >= 0
            ? <button className="primary" onClick={() => logSet(ex.ex.id, st.base, nextSet, restFor(ex.ex, data.settings.rest), ex.ex.name)}>Log set {nextSet + 1}<Icon name="check" /></button>
            : <button className="primary" onClick={() => go(page + 1)}>{page === 0 ? 'Start lifting' : page === items.length ? 'Review workout' : 'Next exercise'}<Icon name="arrow" /></button>}
        <div className="workout-footer-next">
          <button className="quiet-button" onClick={() => go(page - 1)} disabled={page === 0}><Icon name="back" />Back</button>
          {page > 0 && page < pageCount - 1 && <button className="quiet-button" onClick={() => go(page + 1)}><span>{page === items.length ? 'Review workout' : `Next: ${items[page].ex.name}`}</span><Icon name="chevron" /></button>}
          {page === 0 && <span>{items.length} exercises</span>}
        </div>
      </footer>

      {ask === 'discard' && <ConfirmSheet title="Discard this workout?" message="Are you sure you want to discard this workout? The sets you entered and the workout timer will be cleared." confirmLabel="Yes, discard it" onConfirm={discard} onCancel={() => setAsk(null)} />}
      {ask === 'delete' && <ConfirmSheet title="Delete this workout?" message="Are you sure you want to delete this workout? It will be removed from your history and today's check-in will be undone. This can't be undone." confirmLabel="Yes, delete it" onConfirm={deleteLogged} onCancel={() => setAsk(null)} />}
      {DaySheet}
      {sheet?.kind === 'options' && (() => {
        const item = items.find((it) => it.ex.id === sheet.exId)
        if (!item) return null
        const state = exState[items.indexOf(item)]
        return (
          <Sheet title="Exercise options" onClose={() => setSheet(null)}>
            <h3>{item.ex.name}</h3>
            <label>Notes<textarea aria-label="Exercise notes" value={draft.notes[item.ex.id] ?? todaysLog?.entries.find((e) => e.exId === item.ex.id)?.note ?? ''} onChange={(e) => setDraft((dr) => ({ ...dr, notes: { ...dr.notes, [item.ex.id]: e.target.value } }))} placeholder="Add a note for next time" /></label>
            <button className="ghost" onClick={() => { timer.start(restFor(item.ex, data.settings.rest), item.ex.name); setSheet(null) }}><Icon name="clock" />Start rest timer</button>
            <button className="ghost" onClick={() => setSheet({ kind: 'swap', orig: item.orig, cur: item.ex.id })}>Swap exercise</button>
            <button className="ghost" onClick={() => { removeEx(item.orig, item.ex.id); setSheet(null) }}>Remove exercise</button>
            <div className="workout-options">
              <h3>Manage sets</h3>
              {state.rows.map((row, i) => <div className="row" key={i}><span>Set {i + 1}{validSet(row) ? ` · ${row.weight} lb × ${row.reps}` : ''}</span><button className="icon-button" aria-label={`Delete set ${i + 1}`} onClick={() => dropSet(item.ex.id, state.base, i)}><Icon name="close" /></button></div>)}
            </div>
          </Sheet>
        )
      })()}
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
    </div>
  )
}
