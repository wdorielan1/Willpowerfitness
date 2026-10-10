import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../store'
import { useCheckin } from '../actions'
import { ConfirmSheet, fmtClock, Lightbox, Sheet } from '../components'
import { EXERCISES, SPLIT, WARMUP } from '../data'
import type { Exercise } from '../types'
import { addableExercises, cardioFinisher, dayTypeFor, emptySets, fmtRest, fromISO, generateWorkout, recommend, restFor, swapOptions, todayISO, weekSchedule, workoutName, type WeekDay } from '../engine'
import { imgUrl, mediaFor } from '../exerciseMedia'
import { useRestTimer } from '../RestTimer'
import { usePostActions } from './Feed'
import { Icon } from '../icons'
import type { AppData, DayType, Draft, LogEntry, SetEntry, WorkoutFocus } from '../types'

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
  const color: Record<WeekDay['status'], string> = { done: 'var(--ok)', missed: '#ff6b6b', skipped: 'var(--mute)', today: 'var(--accent)', upcoming: 'var(--mute)', rest: 'var(--mute)' }
  const sum = (w: WeekDay) => (w.logged ? `${w.logged.entries.length} exercises · ${w.logged.entries.reduce((a, e) => a + e.sets.length, 0)} sets${w.logged.minutes ? ` · ${w.logged.minutes} min` : ''}` : '')
  return (
    <section className="card train-week-plan" aria-label="This week’s plan">
      <div className="row"><h3><Icon name="calendar" /> This week</h3><span className="tag">{done} of {planned} done</span></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, textAlign: 'center' }}>
        {week.map((w) => (
          <button key={w.date} onClick={() => setOpen(w)} style={{ minHeight: 64, padding: '6px 0', borderRadius: 12, background: 'var(--card2)', border: w.status === 'today' ? '2px solid var(--accent)' : '1px solid var(--line)', display: 'grid', gap: 2, justifyItems: 'center', fontSize: 11, color: 'var(--text)' }}>
            <span className="mute">{w.label}</span><b style={{ color: color[w.status], fontSize: 17 }}>{icon[w.status]}</b><span style={{ color: w.status === 'rest' ? 'var(--mute)' : undefined }}>{ABBR[w.planned]}</span>
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
          <button key={i} className="exercise-photo" aria-label={`View ${m.name}, position ${i + 1}`} onClick={() => setAt(i)}><img src={s} alt={`${m.name}, position ${i + 1}`} loading="lazy" /><span>{i === 0 ? 'Start' : 'Finish'}</span></button>
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

type SessionChoice = { id: string; day: DayType; focus?: WorkoutFocus; label: string; ids?: string[] }
const sessionChoices = (suggested: DayType, saved: { id: string; name: string; ids: string[] }[]): SessionChoice[] => [
  { id: 'usual', day: suggested, label: 'Usual plan' },
  { id: 'chest-triceps', day: 'Push', focus: 'chest-triceps', label: 'Chest + Triceps' },
  { id: 'back-biceps', day: 'Pull', focus: 'back-biceps', label: 'Back + Biceps' },
  ...SPLIT.map((day) => ({ id: day, day, label: workoutName(day) })),
  { id: 'cardio', day: 'Rest/Cardio', label: 'Cardio / recovery' },
  ...saved.map((w) => ({ id: `my:${w.id}`, day: 'Full Body' as DayType, focus: 'custom' as WorkoutFocus, label: w.name, ids: w.ids })),
  { id: 'build', day: 'Full Body', focus: 'custom', label: 'Build your own' },
]

function BuildOwn({ data, ids, setIds, onStart, onSave }: { data: AppData; ids: string[]; setIds: (ids: string[]) => void; onStart: () => void; onSave: (name: string, ids: string[]) => void }) {
  const [muscle, setMuscle] = useState('All')
  const [q, setQ] = useState('')
  const [name, setName] = useState('')
  const [savedMsg, setSavedMsg] = useState(false)
  const all = addableExercises([], data.profile!)
  const muscles = ['All', ...Array.from(new Set(all.map((x) => x.muscle.split('/')[0]))).sort()]
  const list = all.filter((x) => (muscle === 'All' || x.muscle.split('/')[0] === muscle) && (!q.trim() || x.name.toLowerCase().includes(q.trim().toLowerCase())))
  const toggle = (id: string) => { setSavedMsg(false); setIds(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]) }
  const move = (i: number, d: number) => { const j = i + d; if (j < 0 || j >= ids.length) return; const n = [...ids];[n[i], n[j]] = [n[j], n[i]]; setIds(n) }
  const byId = (id: string) => all.find((x) => x.id === id)
  return <div className="train-build">
    <p className="small mute">Pick the exercises you want, in the order you want them. You can save the workout to reuse it.</p>
    {ids.length > 0 && <div className="train-build-picked">{ids.map((id, i) => { const ex = byId(id); return ex ? <div className="train-preview-lift" key={id}><span className="thumbs"><Thumb id={id} /></span><div><b>{i + 1}. {ex.name}</b><span>{ex.muscle}</span></div><div className="train-build-controls"><button className="quiet-action" aria-label={`Move ${ex.name} up`} onClick={() => move(i, -1)} disabled={i === 0}>↑</button><button className="quiet-action" aria-label={`Move ${ex.name} down`} onClick={() => move(i, 1)} disabled={i === ids.length - 1}>↓</button><button className="quiet-action" aria-label={`Remove ${ex.name}`} onClick={() => toggle(id)}>✕</button></div></div> : null })}</div>}
    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search exercises" aria-label="Search exercises" />
    <div className="train-build-muscles">{muscles.map((m) => <button key={m} className={`chip ${muscle === m ? 'on' : ''}`} aria-pressed={muscle === m} onClick={() => setMuscle(m)}>{m}</button>)}</div>
    <div className="train-build-list">{list.map((x) => <button key={x.id} className="minirow" aria-pressed={ids.includes(x.id)} onClick={() => toggle(x.id)}><span className="thumbs"><Thumb id={x.id} /></span><span style={{ flex: 1, textAlign: 'left' }}><b>{x.name}</b><br /><span className="small mute">{x.muscle} · {x.sets} sets · {x.reps[0]}–{x.reps[1]} reps</span></span><span className={`tag ${ids.includes(x.id) ? 'accent' : ''}`}>{ids.includes(x.id) ? 'Added' : 'Add'}</span></button>)}{list.length === 0 && <p className="small mute">No exercises match. Try another muscle group.</p>}</div>
    <button className="primary" disabled={!ids.length} onClick={onStart}>Start lifting · {ids.length} exercise{ids.length === 1 ? '' : 's'}<Icon name="arrow" /></button>
    {ids.length > 0 && <div className="train-build-save"><input value={name} onChange={(e) => { setName(e.target.value); setSavedMsg(false) }} placeholder="Name it to save (e.g. Arm day)" maxLength={30} aria-label="Workout name" /><button className="ghost" disabled={!name.trim()} onClick={() => { onSave(name.trim(), ids); setName(''); setSavedMsg(true) }}>Save</button></div>}
    {savedMsg && <p className="small ok-text" role="status">Saved. It now shows up in your session list.</p>}
  </div>
}

function Chooser({ data, today, short, suggested, current, onStart, onShort, onSave, onDeleteSaved }: {
  data: AppData; today: string; short: boolean; suggested: DayType; current: DayType
  onStart: (d: DayType, focus?: WorkoutFocus, ids?: string[]) => void; onShort: () => void
  onSave: (name: string, ids: string[]) => void; onDeleteSaved: (id: string) => void
}) {
  const choices = sessionChoices(suggested, data.myWorkouts ?? [])
  const [selected, setSelected] = useState(data.workoutFocus?.[today] === 'custom' ? 'build' : data.workoutFocus?.[today] ?? (current === suggested ? 'usual' : current === 'Rest/Cardio' ? 'cardio' : current))
  const [buildIds, setBuildIds] = useState<string[]>(data.customSession?.[today] ?? [])
  const choice = choices.find((item) => item.id === selected) ?? choices[0]
  const isBuild = choice.id === 'build'
  const isSaved = choice.id.startsWith('my:')
  const preview = isBuild ? { day: choice.day, items: [] } : isSaved ? { day: choice.day, items: (choice.ids ?? []).map((id) => EXERCISES.find((x) => x.id === id)).filter((x): x is Exercise => !!x).map((ex) => ({ ex, sets: ex.sets })) } : generateWorkout(today, data, short, choice.day, choice.focus)
  const name = isBuild ? 'Build your own' : isSaved ? choice.label : workoutName(choice.day, choice.focus)
  return <>
    <div className="train-picker-heading"><p className="overline">Today’s session</p><h1>What are you training?</h1><p className="mute small">Choose today’s workout. Your usual weekly plan stays in place.</p></div>
    <div className="train-session-choices" role="group" aria-label="Choose workout">{choices.map((item) => <button key={item.id} aria-pressed={selected === item.id} onClick={() => setSelected(item.id)}>{item.label}{item.id === 'usual' && <span>{workoutName(suggested)}</span>}</button>)}</div>
    <section className="card train-session-preview"><div className="section-head"><h2>{name}</h2><Icon name={choice.day === 'Rest/Cardio' ? 'clock' : 'weight'} /></div>
      <p className="small mute">{isBuild ? 'Choose your own exercises.' : isSaved ? 'One of your saved workouts.' : choice.focus ? 'A focused session for the selected muscle groups.' : FOCUS[choice.day]}</p>
      {isBuild ? <BuildOwn data={data} ids={buildIds} setIds={setBuildIds} onStart={() => onStart('Full Body', 'custom', buildIds)} onSave={onSave} /> : choice.day !== 'Rest/Cardio' ? <>
        <button className="train-short-toggle" aria-pressed={short} onClick={onShort}><Icon name="clock" /><span>Shorter session</span><span>{short ? 'On' : 'Off'}</span></button>
        {preview.items.map(({ ex, sets }) => <div className="train-preview-lift" key={ex.id}><span className="thumbs"><Thumb id={ex.id} /></span><div><b>{ex.name}</b><span>{sets} sets · {ex.reps[0]}–{ex.reps[1]} reps</span></div></div>)}
        {preview.items.length === 0 && <p className="small mute">No exercises match your equipment and exclusions. Choose another session or adjust your profile.</p>}
        <button className="primary" disabled={!preview.items.length} onClick={() => onStart(choice.day, choice.focus, choice.ids)}>Start lifting<Icon name="arrow" /></button>
        {isSaved && <button className="quiet-action" onClick={() => { if (window.confirm(`Delete the saved workout "${choice.label}"?`)) { onDeleteSaved(choice.id.slice(3)); setSelected('usual') } }}>Delete this saved workout</button>}
      </> : <><p className="small mute">Choose an easy walk, bike ride, or your own cardio session. Log the time when you finish.</p><button className="primary" onClick={() => onStart(choice.day)}>Log cardio<Icon name="arrow" /></button></>}
    </section>
  </>
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
  const sessionName = workoutName(plan.day, data.workoutFocus?.[today])
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

  const selectSession = (d: AppData, day: DayType, focus?: WorkoutFocus, ids?: string[]): AppData => ({
    ...d, customSession: focus === 'custom' && ids ? { [today]: ids } : stripToday(d.customSession ?? {}), dayOverride: day === dayTypeFor(today, d.profile!, d.logs) ? stripToday(d.dayOverride) : { ...d.dayOverride, [today]: day },
    workoutFocus: focus ? { ...d.workoutFocus, [today]: focus } : stripToday(d.workoutFocus ?? {}),
    extras: stripToday(d.extras), removed: stripToday(d.removed), swaps: stripToday(d.swaps), drafts: stripToday(d.drafts),
  })
  const beginWith = (day: DayType, focus?: WorkoutFocus, ids?: string[]) => {
    timer.stop(); update((d) => selectSession(d, day, focus, ids)); setIdx(0)
    if (day === 'Rest/Cardio') { nav('/log?t=cardio'); return }
    ci.start()
  }
  const chooseDay = (day: DayType, focus?: WorkoutFocus, ids?: string[]) => {
    if (hasEntered && !confirm(`Switch to ${workoutName(day, focus)}? The sets you entered for today will be cleared.`)) return
    timer.stop(); update((d) => selectSession(d, day, focus, ids)); setSheet(null); setIdx(0)
    if (day === 'Rest/Cardio') nav('/log?t=cardio')
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
  const wipeToday = (d: AppData): AppData => ({ ...d, drafts: stripToday(d.drafts), started: stripToday(d.started), extras: stripToday(d.extras), removed: stripToday(d.removed), swaps: stripToday(d.swaps), dayOverride: stripToday(d.dayOverride), short: stripToday(d.short), workoutFocus: stripToday(d.workoutFocus ?? {}), customSession: stripToday(d.customSession ?? {}) })
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
        logs: [...d.logs.filter((l) => !(l.date === today && !l.baseline)), { date: today, dayType: plan.day, rotationDay: todaysLog?.rotationDay ?? dayTypeFor(today, d.profile!, d.logs), short, entries, minutes: started ? Math.max(1, Math.round(Math.min(Date.now() - started, d.settings.maxWorkoutHours * 3600000) / 60000)) : undefined }],
        checkins: { ...d.checkins, [today]: { going: true, done: true } },
      }
    })
    if (data.settings.autoShare && data.primary && entries.length) {
      const sets = entries.reduce((a, e) => a + e.sets.length, 0)
      const volume = Math.round(entries.reduce((a, e) => a + e.sets.reduce((s, x) => s + x.weight * x.reps, 0), 0))
      const mins = started ? Math.max(1, Math.round(Math.min(Date.now() - started, data.settings.maxWorkoutHours * 3600000) / 60000)) : 0
      void postToCrew({ kind: 'workout', text: `Finished ${sessionName}${mins ? ` in ${mins} min` : ''}`, meta: { sets, volume, exercises: entries.length } })
    }
    timer.stop()
    setSaved(true)
    setTimeout(() => nav('/'), 900)
  }

  // ---------- before the workout starts ----------
  if (!active) {
    return (
      <div className="workout-chooser"><WeekCard onPick={chooseDay} /><Chooser data={data} today={today} short={short} suggested={suggested} current={plan.day}
        onStart={beginWith}
        onSave={(name, ids) => update((d) => ({ ...d, myWorkouts: [...(d.myWorkouts ?? []), { id: `w${Date.now()}`, name, ids }] }))}
        onDeleteSaved={(id) => update((d) => ({ ...d, myWorkouts: (d.myWorkouts ?? []).filter((w) => w.id !== id) }))} onShort={() => update((d) => ({ ...d, short: { ...d.short, [today]: !short } }))} /></div>
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
      <p className="small mute">Change this session while keeping your usual weekly plan.</p>
      <div className="train-session-choices">{sessionChoices(suggested, data.myWorkouts ?? []).filter((choice) => choice.id !== 'build').map((choice) => <button key={choice.id} onClick={() => chooseDay(choice.day, choice.focus, choice.ids)}>{choice.label}</button>)}</div>
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
        <div className="workout-header-title"><b>{sessionName} session</b><span>{short ? 'Short session' : todaysLog ? 'Edit workout' : 'Training'}</span></div>
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
            <WeekCard onPick={chooseDay} />
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
            <ExPhotos id={ex.ex.id} />
            {(() => {
              const m = mediaFor(ex.ex.id)
              return (
                <details className="exercise-guide">
                  <summary><span><Icon name="weight" />Instructions</span><Icon name="chevron" /></summary>
                  <div className="exercise-guide-body">
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
          <p>RPE is <b>how hard your last set felt</b>, from 1 to 10. It tells Wilpow when to add weight.</p>
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
