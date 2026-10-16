import { useEffect, useRef, useState } from 'react'
import { summarize, summaryFromLog, type WorkoutSummary } from '../shareCard'
import { autoShareCrews, postedKey, workoutPost } from '../workoutPost'
import { useMyCrews } from '../CrewPicker'
import { DoneSheet } from '../WorkoutShare'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../store'
import { useCheckin } from '../actions'
import { ConfirmSheet, fmtClock, Lightbox, Sheet } from '../components'
import { EXERCISES, GOALS, SPLIT, WARMUP } from '../data'
import type { Exercise } from '../types'
import { BODY_AREAS, addAfterPick, addDays, addableExercises, cardioFinisher, dayTypeFor, emptySets, fmtRest, fromISO, generateWorkout, historyOf, homeProfile, isHidden, kindLabel, missedCheckIn, placeFor, profileFor, readSkips, withPlace, recommend, restFor, skipCounts, skippedOn, stepDown, streak, swapOptions, todayISO, weekSchedule, workoutName, type WeekDay } from '../engine'
import { EQUIP_KINDS, equipKind, equipUse, kindUse } from '../equipment'
import { EquipmentSheet } from '../EquipmentPicker'
import { imgUrl, mediaFor, useMediaVersion } from '../exerciseMedia'
import { useRestTimer } from '../RestTimer'
import { ShareWorkoutSheet, usePostActions } from './Feed'
import { Icon } from '../icons'
import { ReorderList } from '../Reorder'
import { SwipeRow } from '../SwipeRow'
import { SwipeDemo } from '../SwipeDemo'
import type { AppData, DayType, Draft, EquipKind, LogEntry, Profile, SetEntry, WorkoutFocus, WorkoutLog } from '../types'

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
  const [shareLog, setShareLog] = useState<WorkoutLog | null>(null)
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
      {shareLog && <ShareWorkoutSheet log={shareLog} onClose={() => setShareLog(null)} />}
      {open && (
        <Sheet title={`${fromISO(open.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}`} onClose={() => setOpen(null)}>
          {open.status === 'done' && <><p><b>{open.planned}</b> done ✓</p><p className="small mute">{sum(open)}</p>{open.logged && !open.logged.imported && open.logged.entries.some((e) => e.sets.length) && <button className="ghost" onClick={() => { const l = open.logged!; setOpen(null); setShareLog(l) }}>Share this workout</button>}</>}
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
  useMediaVersion()
  const m = mediaFor(id)
  const [at, setAt] = useState<number | null>(null)
  const [paused, setPaused] = useState(false)
  if (!m) return null
  const srcs = Array.from({ length: m.n }, (_, i) => imgUrl(m.slug, i))
  return (
    <>
      {srcs.length > 1 && (
        <button type="button" className={`exloop ${paused ? 'is-paused' : ''}`} aria-label={`${m.name} motion preview. ${paused ? 'Tap to play' : 'Tap to pause'}`} onClick={() => setPaused(!paused)}>
          <img src={srcs[0]} alt="" /><img className="exloop-b" src={srcs[1]} alt="" />
          <span className="exloop-tag">{paused ? 'Paused' : 'Motion'}</span>
        </button>
      )}
      {srcs.length === 1 && <div className="exphotos">
        {srcs.map((s, i) => (
          <button key={i} className="exercise-photo" aria-label={`View ${m.name}, position ${i + 1}`} onClick={() => setAt(i)}><img src={s} alt={`${m.name}, position ${i + 1}`} loading="lazy" /><span>{i === 0 ? 'Start' : 'Finish'}</span></button>
        ))}
      </div>}
      {at !== null && <Lightbox srcs={srcs} start={at} caption={srcs.map((_, i) => `${m.name} · ${i === 0 ? 'start' : 'finish'}`)} onClose={() => setAt(null)} />}
    </>
  )
}
function Thumb({ id }: { id: string }) {
  const m = mediaFor(id)
  return m ? <img src={imgUrl(m.slug, 0)} alt="" loading="lazy" /> : <span />
}

/** Put a workout's exercises in the order you dragged them into; anything new goes at the end. */
const applyOrder = <T extends { orig: string }>(list: T[], order?: string[]): T[] => {
  if (!order?.length) return list
  const at = (x: T) => { const i = order.indexOf(x.orig); return i < 0 ? order.length + list.indexOf(x) : i }
  return [...list].sort((a, b) => at(a) - at(b))
}

/** What a workout is called when it is saved after a finish ("Leg Day"). */
const savedName = (day: DayType, focus?: WorkoutFocus) => focus === 'chest-triceps' ? 'Chest + Triceps Day' : focus === 'back-biceps' ? 'Back + Biceps Day'
  : ({ Push: 'Push Day', Pull: 'Pull Day', Legs: 'Leg Day', 'Shoulders/Abs': 'Shoulders + Abs Day', 'Full Body': 'Full Body Day', 'Rest/Cardio': 'Cardio' } as Record<DayType, string>)[day]

type SaveOffer = { kind: 'new' | 'update'; name: string; ids: string[]; day: DayType; focus?: WorkoutFocus; existing?: string }

/** Under the recap on the finish screen: save what you just did as your Leg Day (or update it). Never saves without a tap. */
function SaveOfferCard({ offer, onSave, onNever }: { offer: SaveOffer; onSave: () => void; onNever: () => void }) {
  const [done, setDone] = useState<null | 'saved' | 'no'>(null)
  if (done === 'no') return null
  if (done === 'saved') return <p className="small ok-text" role="status">Saved as your {offer.name}. Next time you train it, we'll offer it first.</p>
  return <div className="rec start save-offer">
    <b>{offer.kind === 'update' ? `Update your ${offer.name}?` : `Save this as your ${offer.name}?`}</b>
    <span className="small">{offer.kind === 'update' ? "Next time we'll start from today's lifts." : "We'll offer it next time and put those lifts first when you swap or add."}</span>
    <div className="row">
      <button type="button" className="primary small-btn" onClick={() => { onSave(); setDone('saved') }}>{offer.kind === 'update' ? 'Update it' : 'Save it'}</button>
      <button type="button" className="ghost small-btn" onClick={() => setDone('no')}>Not now</button>
    </div>
    <button type="button" className="quiet-action" onClick={() => { onNever(); setDone('no') }}>Don't ask again</button>
  </div>
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

const FINDER_GEAR = 'wpf.finder.gear'
const readFinderGear = () => { try { return localStorage.getItem(FINDER_GEAR) || 'All' } catch { return 'All' } }
const saveFinderGear = (g: string) => { try { localStorage.setItem(FINDER_GEAR, g) } catch { /* storage unavailable */ } }
const DAY_LIFTS: Partial<Record<DayType, string>> = { Push: 'Push lifts', Pull: 'Pull lifts', Legs: 'Leg lifts', 'Shoulders/Abs': 'Shoulder + ab lifts' }
const TODAY_CHIP = '__today'
const BEST_COUNT = 6

/**
 * Search, muscle and equipment filters over a list of exercises. Used by Build your own, Add an exercise and Swap.
 * With `best`, the list is already best-first: it opens on the few best matches (for Swap, the same muscle; for Add,
 * today's session) with a See more button, and the equipment filter is remembered between visits.
 */
function ExerciseFinder({ pool: rawPool, onPick, picked = [], prefer, like, best = false }: { pool: Exercise[]; onPick: (x: Exercise) => void; picked?: string[]; prefer?: DayType; like?: Exercise; best?: boolean }) {
  // Build your own lists the session's exercises first; the best-first lists are already in order
  const pool = prefer && !best ? [...rawPool.filter((x) => x.day === prefer), ...rawPool.filter((x) => x.day !== prefer)] : rawPool
  const group = (x: Exercise) => x.muscle.split('/')[0]
  const todayChip = best && prefer && pool.some((x) => x.day === prefer && !x.mobility) ? DAY_LIFTS[prefer] : undefined
  const [muscleSel, setMuscle] = useState(() => (like ? group(like) : todayChip ? TODAY_CHIP : 'All'))
  const [gearSel, setGear] = useState(readFinderGear)
  const [shown, setShown] = useState(40)
  const [more, setMore] = useState(false)
  const [q, setQ] = useState('')
  const groups = Array.from(new Set(pool.filter((x) => !x.mobility).map(group))).sort()
  const lead = like && groups.includes(group(like)) ? group(like) : undefined // Swap opens on the lift's own muscle, so it goes first where it can be seen
  const muscles = [...(todayChip ? [TODAY_CHIP] : []), ...(lead ? [lead] : []), 'All', ...groups.filter((g) => g !== lead), ...(pool.some((x) => x.mobility) ? ['Stretching'] : [])]
  const muscle = muscles.includes(muscleSel) ? muscleSel : 'All'
  const kinds = EQUIP_KINDS.filter((k) => pool.some((x) => !x.mobility && equipKind(x) === k.id))
  const gear = kinds.some((k) => k.id === gearSel) ? gearSel : 'All'
  const kindName = (x: Exercise) => EQUIP_KINDS.find((k) => k.id === equipKind(x))?.label ?? ''
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const inMuscle = (x: Exercise) => (muscle === 'Stretching' ? !!x.mobility : !x.mobility && (muscle === 'All' || (muscle === TODAY_CHIP ? x.day === prefer : group(x) === muscle)))
  const matching = pool.filter((x) => inMuscle(x) && (gear === 'All' || equipKind(x) === gear)
    && words.every((w) => `${x.name} ${x.muscle} ${kindName(x)}`.toLowerCase().includes(w)))
  const collapsed = best && !more && words.length === 0
  const list = matching.slice(0, collapsed ? BEST_COUNT : shown)
  const rootRef = useRef<HTMLDivElement>(null)
  // a remembered filter further along a scrolling row of chips still needs to be seen
  useEffect(() => { rootRef.current?.querySelectorAll<HTMLElement>('.train-build-muscles .chip.on').forEach((el) => el.scrollIntoView({ block: 'nearest', inline: 'nearest' })) }, [muscle, gear])
  const choose = (m: string) => { setMuscle(m); setShown(40); setMore(false) }
  const chooseGear = (g: string) => { setGear(g); saveFinderGear(g); setShown(40); setMore(false) }
  return <div className="train-finder" ref={rootRef}>
    <input type="search" value={q} onChange={(e) => { setQ(e.target.value); setShown(40) }} placeholder="Search exercises" aria-label="Search exercises" />
    <div className="train-build-muscles">{muscles.map((m) => <button key={m} className={`chip ${muscle === m ? 'on' : ''}`} aria-pressed={muscle === m} onClick={() => choose(m)}>{m === TODAY_CHIP ? todayChip : m}</button>)}</div>
    {muscle !== 'Stretching' && kinds.length > 1 && <div className="train-build-muscles" aria-label="Equipment">{['All', ...kinds.map((k) => k.id)].map((g) => <button key={g} className={`chip ${gear === g ? 'on' : ''}`} aria-pressed={gear === g} onClick={() => chooseGear(g)}>{g === 'All' ? 'Any equipment' : kinds.find((k) => k.id === g)!.label}</button>)}</div>}
    <p className="small mute">{collapsed ? `Best matches first · ${matching.length} fit` : `${matching.length} exercise${matching.length === 1 ? '' : 's'}`}</p>
    <div className="train-build-list">{list.map((x) => <button key={x.id} className="minirow" aria-pressed={picked.includes(x.id)} onClick={() => onPick(x)}><span className="thumbs"><Thumb id={x.id} /></span><span style={{ flex: 1, textAlign: 'left' }}><b>{x.name}</b><br /><span className="small mute">{x.muscle} · {x.sets} sets · {x.reps[0]}–{x.reps[1]} reps</span></span><span className={`tag ${picked.includes(x.id) ? 'accent' : ''}`}>{picked.includes(x.id) ? 'Added' : 'Add'}</span></button>)}{list.length === 0 && <p className="small mute">No exercises match. Try another word or muscle group.</p>}{collapsed && matching.length > list.length && <button className="ghost" onClick={() => setMore(true)}>See more ({matching.length - list.length} more)</button>}{!collapsed && matching.length > shown && <button className="ghost" onClick={() => setShown(shown + 40)}>Show more ({matching.length - shown} left)</button>}</div>
  </div>
}

function BuildOwn({ data, ids, setIds, onStart, onSave }: { data: AppData; ids: string[]; setIds: (ids: string[]) => void; onStart: () => void; onSave: (name: string, ids: string[]) => void }) {
  const [name, setName] = useState('')
  const [savedMsg, setSavedMsg] = useState(false)
  const all = addableExercises([], data.profile!)
  const toggle = (id: string) => { setSavedMsg(false); setIds(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]) }
  const move = (i: number, d: number) => { const j = i + d; if (j < 0 || j >= ids.length) return; const n = [...ids];[n[i], n[j]] = [n[j], n[i]]; setIds(n) }
  const byId = (id: string) => all.find((x) => x.id === id)
  return <div className="train-build">
    <p className="small mute">Pick the exercises you want, in the order you want them. You can save the workout to reuse it.</p>
    {ids.length > 0 && <div className="train-build-picked">{ids.map((id, i) => { const ex = byId(id); return ex ? <div className="train-preview-lift" key={id}><span className="thumbs"><Thumb id={id} /></span><div><b>{i + 1}. {ex.name}</b><span>{ex.muscle}</span></div><div className="train-build-controls"><button className="quiet-action" aria-label={`Move ${ex.name} up`} onClick={() => move(i, -1)} disabled={i === 0}>↑</button><button className="quiet-action" aria-label={`Move ${ex.name} down`} onClick={() => move(i, 1)} disabled={i === ids.length - 1}>↓</button><button className="quiet-action" aria-label={`Remove ${ex.name}`} onClick={() => toggle(id)}>✕</button></div></div> : null })}</div>}
    <ExerciseFinder pool={all} picked={ids} onPick={(x) => toggle(x.id)} />
    <button className="primary" disabled={!ids.length} onClick={onStart}>Start lifting · {ids.length} exercise{ids.length === 1 ? '' : 's'}<Icon name="arrow" /></button>
    {ids.length > 0 && <div className="train-build-save"><input value={name} onChange={(e) => { setName(e.target.value); setSavedMsg(false) }} placeholder="Name it to save (e.g. Arm day)" maxLength={30} aria-label="Workout name" /><button className="ghost" disabled={!name.trim()} onClick={() => { onSave(name.trim(), ids); setName(''); setSavedMsg(true) }}>Save</button></div>}
    {savedMsg && <p className="small ok-text" role="status">Saved. It now shows up in your session list.</p>}
  </div>
}

function Chooser({ data, today, short, suggested, current, onStart, onShort, onSave, onDeleteSaved }: {
  data: AppData; today: string; short: boolean; suggested: DayType; current: DayType
  onStart: (d: DayType, focus?: WorkoutFocus, ids?: string[], tweaks?: { removed: string[]; extras: string[]; order?: string[] }) => void; onShort: () => void
  onSave: (name: string, ids: string[]) => void; onDeleteSaved: (id: string) => void
}) {
  const choices = sessionChoices(suggested, data.myWorkouts ?? [])
  const [selected, setSelected] = useState(data.workoutFocus?.[today] === 'custom' ? 'build' : data.workoutFocus?.[today] ?? (current === suggested ? 'usual' : current === 'Rest/Cardio' ? 'cardio' : current))
  const [buildIds, setBuildIds] = useState<string[]>(data.customSession?.[today] ?? [])
  const [removedIds, setRemoved] = useState<string[]>([])
  const [addedIds, setAdded] = useState<string[]>([])
  const [orderIds, setOrderIds] = useState<string[]>([])
  const [adding, setAdding] = useState(false)
  const { update } = useApp()
  const [askEquip, setAskEquip] = useState<(() => void) | null>(null) // the first start of a workout offers the equipment screen
  const [equipNote, setEquipNote] = useState(false)
  const [offerGone, setOfferGone] = useState(false)
  // whole workouts that did not happen: one "what's in the way?" card, never more than once a week
  const miss = data.settings.askSkips === false || (data.missedAsked && addDays(data.missedAsked, 6) >= today) ? null : missedCheckIn(data, today)
  const [missOpen, setMissOpen] = useState(true)
  const [fixing, setFixing] = useState<null | 'lifts' | 'equip'>(null)
  const [dislikes, setDislikes] = useState<string[]>([])
  const [missNote, setMissNote] = useState('')
  const showMiss = !!miss && missOpen
  const answered = () => { update((d) => ({ ...d, missedAsked: today })); setMissOpen(false) }
  const asked = () => update((d) => ({ ...d, settings: { ...d.settings, equipAsked: Date.now() } }))
  const pickSession = (id: string) => { setSelected(id); setRemoved([]); setAdded([]); setOrderIds([]) }
  const choice = choices.find((item) => item.id === selected) ?? choices[0]
  const isBuild = choice.id === 'build'
  const isSaved = choice.id.startsWith('my:')
  const made = isBuild ? { day: choice.day, items: [] as { ex: Exercise; sets: number; orig: string; focus?: string }[] } : isSaved ? { day: choice.day, items: (choice.ids ?? []).map((id) => EXERCISES.find((x) => x.id === id)).filter((x): x is Exercise => !!x).map((ex) => ({ ex, sets: ex.sets, orig: ex.id, focus: undefined as string | undefined })) } : generateWorkout(today, { ...data, removed: { ...data.removed, [today]: removedIds }, extras: { ...data.extras, [today]: addedIds } }, short, choice.day, choice.focus)
  const preview = { day: made.day, items: applyOrder(made.items, orderIds) }
  const generated = !isBuild && !isSaved && choice.day !== 'Rest/Cardio'
  // one nudge at a time: first the saved workout for this session, otherwise a lift they keep turning away
  const savedMatch = generated ? (data.myWorkouts ?? []).find((w) => w.day === choice.day && w.focus === choice.focus) : undefined
  const stop = generated && !savedMatch ? Object.entries(skipCounts(data, addDays(today, 1)))
    .filter(([id, n]) => n >= 3 && (choice.day === 'Full Body' || EXERCISES.find((x) => x.id === id)?.day === choice.day || preview.items.some((i) => i.ex.id === id)))
    .map(([id, n]) => ({ ex: EXERCISES.find((x) => x.id === id), n })).filter((c): c is { ex: Exercise; n: number } => !!c.ex && !isHidden(c.ex, data.profile!))
    .sort((a, b) => b.n - a.n)[0] : undefined
  const stopSuggesting = (id: string) => update((d) => ({ ...d, profile: { ...d.profile!, hidden: { ...d.profile!.hidden, [id]: addDays(today, -1) } } })) // dated yesterday so today's preview drops it right away
  const keepSuggesting = (id: string) => update((d) => ({ ...d, profile: { ...d.profile!, kept: [...(d.profile!.kept ?? []), id] } }))
  const name = isBuild ? 'Build your own' : isSaved ? choice.label : workoutName(choice.day, choice.focus)
  return <>
    <div className="train-picker-heading"><p className="overline">Today’s session</p><h1>What are you training?</h1><p className="mute small">Choose today’s workout. Your usual weekly plan stays in place.</p></div>
    {data.profile!.gear === 'gym' && (() => {
      const at = placeFor(data, today)
      const set = (to: 'gym' | 'home') => update((d) => withPlace(d, to, today))
      return <div className="train-place">
        <div className="seg" role="group" aria-label="Where are you training today?"><span className="train-place-label">Today I’m at</span>
          <button type="button" className={at === 'gym' ? 'on' : ''} aria-pressed={at === 'gym'} onClick={() => set('gym')}>Gym</button>
          <button type="button" className={at === 'home' ? 'on' : ''} aria-pressed={at === 'home'} onClick={() => set('home')}>Home</button></div>
        {at === 'home' && <p className="small mute">Home plans use dumbbell and bodyweight lifts only. It stays on Home until you switch it back.</p>}
      </div>
    })()}
    {showMiss && miss && <div className="rec start train-offer" role="group" aria-label="What's in the way?">
      <b>What’s in the way?</b>
      <span className="small">{miss.reason === 'row' ? 'You’ve missed your last two workouts.' : `You’ve missed ${workoutName(miss.day)} twice.`} Pick the closest one and we’ll adjust. Nothing changes unless you tap.</span>
      <div className="row">
        <button type="button" className="ghost small-btn" onClick={() => { setDislikes([]); setFixing('lifts') }}>I don’t like the lifts</button>
        <button type="button" className="ghost small-btn" onClick={() => setFixing('equip')}>Wrong equipment</button>
        <button type="button" className="ghost small-btn" onClick={() => { if (!short) onShort(); setMissNote('Shorter session is on, so today is quicker.'); answered() }}>No time</button>
        <button type="button" className="ghost small-btn" onClick={() => { pickSession('cardio'); setMissNote('Take it easy today. Log a walk or a ride, and your plan is here when you’re ready.'); answered() }}>Tired or hurt</button>
      </div>
      <div className="row"><button type="button" className="quiet-action" onClick={answered}>Not now</button><button type="button" className="quiet-action" onClick={() => { update((d) => ({ ...d, settings: { ...d.settings, askSkips: false } })); setMissOpen(false) }}>Don’t ask again</button></div>
    </div>}
    {missNote && <p className="small ok-text" role="status">{missNote}</p>}
    <div className="train-session-choices" role="group" aria-label="Choose workout">{choices.map((item) => <button key={item.id} aria-pressed={selected === item.id} onClick={() => pickSession(item.id)}>{item.label}{item.id === 'usual' && <span>{workoutName(suggested)}</span>}</button>)}</div>
    {fixing === 'lifts' && miss && <Sheet title="Which lifts don’t you like?" onClose={() => setFixing(null)}>
      <p className="small mute">Tap the ones to stop suggesting. You can bring them back any time in Settings.</p>
      {generateWorkout(today, data, short, miss.day).items.map(({ ex }) => <button key={ex.id} type="button" className="ghost sheet-choice" aria-pressed={dislikes.includes(ex.id)} onClick={() => setDislikes(dislikes.includes(ex.id) ? dislikes.filter((x) => x !== ex.id) : [...dislikes, ex.id])}><b>{dislikes.includes(ex.id) ? '✓ ' : ''}{ex.name}</b><span className="small mute">{ex.muscle}</span></button>)}
      <button type="button" className="primary" disabled={!dislikes.length} onClick={() => { dislikes.forEach(stopSuggesting); setFixing(null); setMissNote(`Done. We won’t suggest ${dislikes.length === 1 ? 'that lift' : 'those lifts'} again.`); answered() }}>Stop suggesting {dislikes.length || ''}</button>
    </Sheet>}
    {fixing === 'equip' && <EquipmentSheet gear={data.profile!.gear} equip={data.profile!.equip} onClose={() => setFixing(null)} onSkip={() => setFixing(null)}
      onSave={(equip) => { update((d) => ({ ...d, profile: { ...d.profile!, equip } })); setFixing(null); setMissNote('Your plan now follows the equipment you use.'); answered() }} />}
    <section className="card train-session-preview"><div className="section-head"><h2>{name}</h2><Icon name={choice.day === 'Rest/Cardio' ? 'clock' : 'weight'} /></div>
      <p className="small mute">{isBuild ? 'Choose your own exercises.' : isSaved ? 'One of your saved workouts.' : choice.focus ? 'A focused session for the selected muscle groups.' : FOCUS[choice.day]}</p>
      {isBuild ? <BuildOwn data={data} ids={buildIds} setIds={setBuildIds} onStart={() => onStart('Full Body', 'custom', buildIds)} onSave={onSave} /> : choice.day !== 'Rest/Cardio' ? <>
        {savedMatch && !offerGone && !showMiss && <div className="rec start train-offer">
          <b>Use your saved {savedMatch.name}?</b>
          <span className="small">Your {savedMatch.ids.length} lifts from last time, in the order you did them.</span>
          <div className="row"><button type="button" className="primary small-btn" onClick={() => pickSession(`my:${savedMatch.id}`)}>Use it</button><button type="button" className="ghost small-btn" onClick={() => setOfferGone(true)}>Not now</button></div>
        </div>}
        {stop && !showMiss && <div className="rec start train-offer" role="group" aria-label="Stop suggesting this lift?">
          <b>Stop suggesting {stop.ex.name}?</b>
          <span className="small">You've skipped it on {stop.n} different days. Nothing gets hidden unless you say so.</span>
          <div className="row"><button type="button" className="primary small-btn" onClick={() => stopSuggesting(stop.ex.id)}>Stop suggesting it</button><button type="button" className="ghost small-btn" onClick={() => keepSuggesting(stop.ex.id)}>Keep it</button></div>
        </div>}
        <button className="train-short-toggle" aria-pressed={short} onClick={onShort}><Icon name="clock" /><span>Shorter session</span><span>{short ? 'On' : 'Off'}</span></button>
        {preview.items.length > 1 && <p className="small mute train-reorder-hint">Press and hold a lift, then drag it up or down to change the order.</p>}
        <ReorderList label="Exercises in this workout" items={preview.items} getKey={(x) => x.ex.id} onReorder={(next) => setOrderIds(next.map((x) => x.orig))}>{({ ex, sets, orig, focus }) => <div className={`train-preview-lift${isSaved ? '' : ' has-remove'}`}><span className="thumbs"><Thumb id={ex.id} /></span><div><b>{ex.name}</b><span>{sets} sets · {ex.reps[0]}–{ex.reps[1]} reps</span>{focus && <span className="focus-note">{focus}</span>}</div>{!isSaved && <button className="quiet-action train-remove" aria-label={`Remove ${ex.name}`} onClick={() => (addedIds.includes(ex.id) ? setAdded(addedIds.filter((x) => x !== ex.id)) : setRemoved([...removedIds, orig]))}>✕</button>}</div>}</ReorderList>
        {!isSaved && <button className="ghost" onClick={() => setAdding(true)}><Icon name="plus" />Add an exercise</button>}
        {adding && <Sheet title="Add an exercise" onClose={() => setAdding(false)}><ExerciseFinder best prefer={choice.day} pool={addableExercises(preview.items.map((i) => i.ex.id), profileFor(data, today), historyOf(data), choice.day)} onPick={(x) => { setAdded([...addedIds, x.id]); setRemoved(removedIds.filter((id) => id !== x.id)); setAdding(false) }} /></Sheet>}
        {preview.items.length === 0 && <p className="small mute">No exercises match your equipment and exclusions. Choose another session, or turn more equipment on in Settings.</p>}
        {equipNote && <p className="small ok-text" role="status">Your plan now follows the equipment you use. Tap Start lifting when you're ready.</p>}
        <button className="primary" disabled={!preview.items.length} onClick={() => {
          const go = () => onStart(choice.day, choice.focus, isSaved ? preview.items.map((x) => x.orig) : choice.ids, isSaved ? undefined : { removed: removedIds, extras: addedIds, order: orderIds })
          if (!isSaved && !data.settings.equipAsked) setAskEquip(() => go); else go()
        }}>Start lifting<Icon name="arrow" /></button>
        {askEquip && <EquipmentSheet gear={data.profile!.gear} equip={data.profile!.equip}
          onClose={() => { asked(); setAskEquip(null) }}
          onSkip={() => { asked(); askEquip(); setAskEquip(null) }}
          onSave={(equip) => { update((d) => ({ ...d, profile: { ...d.profile!, equip }, settings: { ...d.settings, equipAsked: Date.now() } })); setAskEquip(null); setEquipNote(true) }} />}
        {isSaved && <button className="quiet-action" onClick={() => { if (window.confirm(`Delete the saved workout "${choice.label}"?`)) { onDeleteSaved(choice.id.slice(3)); pickSession('usual') } }}>Delete this saved workout</button>}
      </> : <><p className="small mute">Choose an easy walk, bike ride, or your own cardio session. Log the time when you finish.</p><button className="primary" onClick={() => onStart(choice.day)}>Log cardio<Icon name="arrow" /></button></>}
    </section>
  </>
}


export default function Workout() {
  useMediaVersion()
  const { data, update } = useApp()
  const ci = useCheckin()
  const timer = useRestTimer()
  const { postTo } = usePostActions('')
  const myCrews = useMyCrews()
  const nav = useNavigate()
  const p = data.profile!
  const today = todayISO()
  const here = data.atHome?.[today] ? homeProfile(p) : profileFor(data, today) // what Swap and Add may offer today: at home means no gym equipment
  const skippedIds = skippedOn(data, today) // planned lifts removed or swapped away in today's workout
  const short = !!data.short[today]
  const suggested = dayTypeFor(today, p, data.logs)
  const plan = generateWorkout(today, data, short)
  const sessionName = workoutName(plan.day, data.workoutFocus?.[today])
  const draft: Draft = data.drafts[today] ?? { sets: {}, notes: {} }
  const todaysLog = data.logs.find((l) => l.date === today && !l.baseline)
  const started = data.started[today]
  const hasEntered = [draft.completed, draft.touched].some((m) => Object.values(m ?? {}).some((a) => a.some(Boolean)))
  const active = (!!started || !!todaysLog || hasEntered) && plan.day !== 'Rest/Cardio'
  const items = applyOrder(plan.items, data.exOrder?.[today])
  const reorderToday = (next: typeof items) => update((d) => ({ ...d, exOrder: { ...d.exOrder, [today]: next.map((x) => x.orig) } }))
  const planIds = items.map((i) => i.ex.id)
  const cardio = cardioFinisher(p, plan.day)

  const [idx, setIdx] = useState(0)
  const dir = useRef(1)
  const touch = useRef<{ x: number; y: number } | null>(null)
  const [saved, setSaved] = useState(false)
  const [summary, setSummary] = useState<WorkoutSummary | null>(null)
  const [sharedTo, setSharedTo] = useState<string[]>([]) // the crews the workout just went to by itself
  const [resharing, setResharing] = useState(false)
  const [saveOffer, setSaveOffer] = useState<SaveOffer | null>(null)
  const [validation, setValidation] = useState('')
  const [undo, setUndo] = useState<null | { label: string; restore?: (d: AppData) => AppData; tune?: boolean }>(null)
  const [check, setCheck] = useState<null | { atGym: boolean }>(null) // the "skipping a few lifts?" check-in
  const [fixEquip, setFixEquip] = useState(false)
  // the little swipe demo plays until they swipe a set or tap Got it, then never comes back
  const [swipeSeen, setSwipeSeen] = useState(() => { try { return localStorage.getItem('wpf.swipeSeen') === '1' } catch { return false } })
  const seeSwipe = () => { setSwipeSeen(true); try { localStorage.setItem('wpf.swipeSeen', '1') } catch { /* private mode: it just shows again next time */ } }
  useEffect(() => { if (!undo) return; const t = setTimeout(() => setUndo(null), 7000); return () => clearTimeout(t) }, [undo])
  const [ask, setAsk] = useState<null | 'discard' | 'delete'>(null)
  const [buildIds, setBuildIds] = useState<string[]>(data.customSession?.[today] ?? [])
  const [sheet, setSheet] = useState<null | { kind: 'day' } | { kind: 'build' } | { kind: 'swap'; orig: string; cur: string } | { kind: 'add' } | { kind: 'rpe' } | { kind: 'options'; exId: string } | { kind: 'dislike'; exId: string }>(null)
  const [sp, setSp] = useSearchParams()
  useEffect(() => { if (sp.get('change')) { if (active) setSheet({ kind: 'day' }); setSp({}, { replace: true }) } }, [sp, setSp, active])

  const pageCount = items.length + 2 // warm-up, exercises, finish
  const page = Math.min(idx, pageCount - 1)
  const go = (n: number) => {
    const t = Math.max(0, Math.min(pageCount - 1, n))
    dir.current = t >= page ? 1 : -1
    setIdx(t)
    setValidation(''); setUndo(null)
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
  const defReps = (e: Exercise) => String(e.reps[1])
  const touchedFor = (dr: Draft, exId: string, n: number) => Array.from({ length: n }, (_, j) => !!dr.touched?.[exId]?.[j])
  const edit = (exId: string, base: SetEntry[], i: number, k: keyof SetEntry, v: string) => {
    setValidation(''); setUndo(null)
    setDraft((dr) => {
      const rows = dr.sets[exId] ?? base
      const done = completionFor(dr, exId, rows), was = rows[i]?.weight ?? ''
      // a new weight carries down to the sets after it, unless those are already logged or were set on their own
      const next = rows.map((r, j) => (j === i ? { ...r, [k]: v } : k === 'weight' && j > i && !done[j] && (r.weight === was || r.weight.trim() === '') ? { ...r, weight: v } : r))
      const touched = touchedFor(dr, exId, rows.length)
      if (k === 'reps') touched[i] = true
      return { ...dr, sets: { ...dr.sets, [exId]: next }, completed: { ...dr.completed, [exId]: done.map((d, j) => (j === i ? false : d)) }, touched: { ...dr.touched, [exId]: touched } }
    })
  }
  const addSet = (exId: string, base: SetEntry[], reps: string) =>
    setDraft((dr) => {
      const rows = dr.sets[exId] ?? base
      return { ...dr, sets: { ...dr.sets, [exId]: [...rows, { weight: rows[rows.length - 1]?.weight ?? '', reps: rows[rows.length - 1]?.reps || reps, rpe: '' }] }, completed: { ...dr.completed, [exId]: [...completionFor(dr, exId, rows), false] }, touched: { ...dr.touched, [exId]: [...touchedFor(dr, exId, rows.length), false] } }
    })
  const dropSet = (exId: string, base: SetEntry[], i: number, reps: string) =>
    setDraft((dr) => {
      const current = dr.sets[exId] ?? base, rows = current.filter((_, j) => j !== i)
      return {
        ...dr, sets: { ...dr.sets, [exId]: rows.length ? rows : [{ weight: current[0]?.weight ?? '', reps, rpe: '' }] },
        completed: { ...dr.completed, [exId]: rows.length ? completionFor(dr, exId, current).filter((_, j) => j !== i) : [false] },
        touched: { ...dr.touched, [exId]: rows.length ? touchedFor(dr, exId, current.length).filter((_, j) => j !== i) : [false] },
      }
    })
  /** Swipe-to-delete: gone straight away, with a few seconds to take it back. */
  const removeSet = (exId: string, base: SetEntry[], i: number, reps: string) => {
    const before = draft
    setUndo({ label: `Set ${i + 1} deleted`, restore: (d) => ({ ...d, drafts: { ...d.drafts, [today]: before } }) }); setValidation('')
    dropSet(exId, base, i, reps)
  }
  const logSet = (exId: string, base: SetEntry[], i: number, rest: number, name: string) => {
    const rows = draft.sets[exId] ?? base
    if (!rows[i] || !validSet(rows[i])) {
      setValidation(`Set ${i + 1}: enter a weight of 0 or more and reps greater than 0.`)
      document.getElementById(`set-${exId}-${i}-${rows[i]?.weight.trim() === '' || Number(rows[i]?.weight) < 0 ? 'weight' : 'reps'}`)?.focus()
      return
    }
    if (completionFor(draft, exId, rows)[i]) return
    setValidation(''); setUndo(null)
    setDraft((dr) => {
      const cur = dr.sets[exId] ?? base, done = completionFor(dr, exId, cur), at = cur[i]
      // logging a later set means the ones before it were done too: log them with it, borrowing any blank weight or reps
      const filled = cur.map((r, j) => (j < i && !done[j] ? { ...r, weight: r.weight.trim() ? r.weight : at.weight, reps: r.reps.trim() ? r.reps : at.reps } : r))
      return { ...dr, sets: { ...dr.sets, [exId]: filled }, completed: { ...dr.completed, [exId]: done.map((d, j) => d || j <= i) } }
    })
    if (data.settings.autoTimer) timer.start(rest, name)
  }

  const baseFor = (exId: string, nSets: number, weight: number | null, reps: string): SetEntry[] => {
    const logged = todaysLog?.entries.find((e) => e.exId === exId)
    return logged ? logged.sets.map((s) => ({ weight: String(s.weight), reps: String(s.reps), rpe: s.rpe ? String(s.rpe) : '' })) : emptySets(nSets, weight, reps)
  }
  const exState = items.map((it) => {
    const rec = recommend(it.ex, data.logs.filter((l) => l.date !== today), today)
    const base = baseFor(it.ex.id, it.sets, rec.weight, defReps(it.ex))
    const rows = draft.sets[it.ex.id] ?? base
    const completed = completionFor(draft, it.ex.id, rows)
    const loggedLen = todaysLog?.entries.find((e) => e.exId === it.ex.id)?.sets.length ?? 0
    // sets start filled in, so one only counts once it is logged, its reps were typed, or it was already in the saved workout
    const mine = rows.map((_, j) => completed[j] || !!draft.touched?.[it.ex.id]?.[j] || j < loggedLen)
    const counted = rows.map((r, j) => mine[j] && validSet(r))
    const bad = rows.map((r, j) => mine[j] && r.reps.trim() !== '' && !validSet(r))
    return { rec, base, rows, completed, counted, bad, done: rows.length > 0 && completed.every(Boolean) }
  })

  const selectSession = (d: AppData, day: DayType, focus?: WorkoutFocus, ids?: string[], tweaks?: { removed: string[]; extras: string[]; order?: string[] }): AppData => ({
    ...d, exOrder: tweaks?.order?.length ? { ...stripToday(d.exOrder ?? {}), [today]: tweaks.order } : stripToday(d.exOrder ?? {}), customSession: focus === 'custom' && ids ? { [today]: ids } : stripToday(d.customSession ?? {}), dayOverride: day === dayTypeFor(today, d.profile!, d.logs) ? stripToday(d.dayOverride) : { ...d.dayOverride, [today]: day },
    workoutFocus: focus ? { ...d.workoutFocus, [today]: focus } : stripToday(d.workoutFocus ?? {}),
    extras: tweaks?.extras.length ? { ...stripToday(d.extras), [today]: tweaks.extras } : stripToday(d.extras), removed: tweaks?.removed.length ? { ...stripToday(d.removed), [today]: tweaks.removed } : stripToday(d.removed), swaps: stripToday(d.swaps), drafts: stripToday(d.drafts),
  })
  const beginWith = (day: DayType, focus?: WorkoutFocus, ids?: string[], tweaks?: { removed: string[]; extras: string[]; order?: string[] }) => {
    timer.stop(); update((d) => selectSession(d, day, focus, ids, tweaks)); setIdx(0)
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
      const drafts = { ...d.drafts, [today]: { ...(d.drafts[today] ?? { sets: {}, notes: {} }), sets: Object.fromEntries(Object.entries(d.drafts[today]?.sets ?? {}).filter(([k]) => k !== cur)), completed: Object.fromEntries(Object.entries(d.drafts[today]?.completed ?? {}).filter(([k]) => k !== cur)), touched: Object.fromEntries(Object.entries(d.drafts[today]?.touched ?? {}).filter(([k]) => k !== cur)) } }
      if (isExtra) return { ...d, extras: { ...d.extras, [today]: (d.extras[today] ?? []).map((x) => (x === cur ? next : x)) }, exOrder: d.exOrder?.[today] ? { ...d.exOrder, [today]: d.exOrder[today].map((x) => (x === cur ? next : x)) } : d.exOrder, drafts }
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
  /** Swipe left on a lift: gone from today's workout, with a few seconds to take it back. */
  const removeLift = (it: (typeof items)[number]) => {
    const prev = { extras: data.extras, removed: data.removed, exOrder: data.exOrder }
    const firstSkip = skippedIds.length === 0 && data.settings.askSkips !== false && !(data.extras[today] ?? []).includes(it.ex.id)
    removeEx(it.orig, it.ex.id)
    setUndo({ label: `Removed ${it.ex.name}`, restore: (d) => ({ ...d, ...prev }), tune: firstSkip })
  }
  /** Thumbs-down, "Never show me this": gone from today, and hidden from Swap, Add and search now and from planned workouts from tomorrow. Undo puts it all back. */
  const neverShow = (it: (typeof items)[number]) => {
    const prev = { extras: data.extras, removed: data.removed, exOrder: data.exOrder }
    const prevHidden = data.profile!.hidden
    update((d) => ({ ...d, profile: { ...d.profile!, hidden: { ...d.profile!.hidden, [it.ex.id]: today } } }))
    removeEx(it.orig, it.ex.id)
    setUndo({ label: `Hidden ${it.ex.name}. You can bring it back in Settings.`, restore: (d) => ({ ...d, ...prev, profile: { ...d.profile!, hidden: prevHidden } }) })
  }
  /** Swipe right on a lift: keep it and add a new one right after it that works the same muscle and fits their gear. */
  const addAfter = (it: (typeof items)[number]) => {
    const pick = addAfterPick(it.ex, planIds, here, historyOf(data), plan.day)
    if (!pick) { setUndo({ label: 'Nothing else fits your gear for this spot.' }); return }
    const prev = { extras: data.extras, removed: data.removed, exOrder: data.exOrder }
    const order = items.map((x) => x.orig)
    order.splice(order.indexOf(it.orig) + 1, 0, pick.id)
    update((d) => ({ ...d, extras: { ...d.extras, [today]: [...(d.extras[today] ?? []), pick.id] }, removed: { ...d.removed, [today]: (d.removed[today] ?? []).filter((x) => x !== pick.id) }, exOrder: { ...d.exOrder, [today]: order } }))
    setUndo({ label: `Added ${pick.name} after ${it.ex.name}`, restore: (d) => ({ ...d, ...prev }) })
  }
  const addEx = (id: string) => {
    update((d) => ({ ...d, extras: { ...d.extras, [today]: [...(d.extras[today] ?? []), id] }, removed: { ...d.removed, [today]: (d.removed[today] ?? []).filter((x) => x !== id) } }))
    setSheet(null); go(items.length + 1)
  }
  const wipeToday = (d: AppData): AppData => ({ ...d, exOrder: stripToday(d.exOrder ?? {}), workoutPosted: stripToday(d.workoutPosted ?? {}), drafts: stripToday(d.drafts), started: stripToday(d.started), extras: stripToday(d.extras), removed: stripToday(d.removed), swaps: stripToday(d.swaps), planPlace: stripToday(d.planPlace ?? {}), dayOverride: stripToday(d.dayOverride), short: stripToday(d.short), workoutFocus: stripToday(d.workoutFocus ?? {}), customSession: stripToday(d.customSession ?? {}) })
  const discard = () => { timer.stop(); update(wipeToday); ci.reset(); setAsk(null); nav('/') }
  const deleteLogged = () => { timer.stop(); update((d) => ({ ...wipeToday(d), logs: d.logs.filter((l) => !(l.date === today && !l.baseline)) })); ci.reset(); setAsk(null); nav('/') }

  // ---- skip check-ins: after a second skipped lift in one workout, ask what is going on and offer a fix (at most once a day) ----
  const skippedExs = skippedIds.map((id) => EXERCISES.find((x) => x.id === id)).filter((x): x is Exercise => !!x)
  useEffect(() => {
    if (!active || todaysLog || skippedIds.length < 2 || data.skipAsked === today || data.settings.askSkips === false) return
    update((d) => ({ ...d, skipAsked: today }))
    setCheck({ atGym: data.place?.date === today }) // said where they are today: no need to ask the gym question
  }, [skippedIds.length, active]) // eslint-disable-line react-hooks/exhaustive-deps
  /** Swap the lifts not started yet that `needs` replacing for the best alternatives under `prof`, in one step that Undo puts back. Lifts already worked on never move. */
  const rebuild = (needs: (x: Exercise) => boolean, prof: Profile, label: (n: number) => string, patch: (d: AppData) => AppData = (d) => d, restore: (d: AppData) => AppData = (d) => d) => {
    const prev = { swaps: data.swaps, extras: data.extras, exOrder: data.exOrder }
    const taken = items.map((i) => i.ex.id)
    const newSwaps: Record<string, string> = {}
    const newExtras: Record<string, string> = {} // an added lift: old id to new id
    items.forEach((it, i) => {
      if (exState[i].counted.some(Boolean) || exState[i].completed.some(Boolean) || !needs(it.ex)) return
      const pick = swapOptions(it.ex, taken, prof, historyOf(data))[0]
      if (!pick) return
      taken.push(pick.id)
      if ((data.extras[today] ?? []).includes(it.ex.id)) newExtras[it.ex.id] = pick.id; else newSwaps[`${today}|${it.orig}`] = pick.id
    })
    const n = Object.keys(newSwaps).length + Object.keys(newExtras).length
    update((d) => {
      const x = patch(d)
      return {
        ...x, swaps: { ...x.swaps, ...newSwaps },
        ...(x.extras[today]?.length ? { extras: { ...x.extras, [today]: x.extras[today].map((id) => newExtras[id] ?? id) } } : {}),
        ...(x.exOrder?.[today] ? { exOrder: { ...x.exOrder, [today]: x.exOrder[today].map((id) => newExtras[id] ?? id) } } : {}),
      }
    })
    setUndo({ label: label(n), restore: (d) => ({ ...restore(d), ...prev }) })
  }
  const lifts = (n: number) => `${n} ${n === 1 ? 'lift' : 'lifts'}`
  /** "I'm at home": the rest of today's lifts that need a gym become dumbbell and bodyweight ones. */
  const goHome = () => {
    const prevPlace = data.place, prevPlan = data.planPlace
    setCheck(null)
    rebuild((x) => x.gear === 'gym', homeProfile(p), (n) => n ? `Rebuilt the rest for home: ${lifts(n)} swapped for dumbbell or bodyweight ones.` : 'The rest of your workout already works at home.',
      (d) => ({ ...withPlace(d, 'home', today), atHome: { ...d.atHome, [today]: true } }),
      (d) => ({ ...d, atHome: Object.fromEntries(Object.entries(d.atHome ?? {}).filter(([k]) => k !== today)), place: prevPlace, planPlace: prevPlan }))
  }
  /**
   * Equipment changed in the middle of a workout. Today's plan keeps the old choices (so nothing already done can drop out of it), the lifts
   * not started yet are swapped to follow the new ones, and the new choices apply from tomorrow.
   */
  const changeEquip = (equip: Profile['equip'], label: (n: number) => string) => {
    const next: Profile = { ...p, equip }
    const was = { equip: p.equip, equipWas: p.equipWas, equipSince: p.equipSince }
    rebuild((x) => !x.mobility && equipUse(next, x) === 'never', next, label,
      (d) => ({ ...d, profile: { ...d.profile!, equip, equipWas: d.profile!.equipSince === today ? d.profile!.equipWas : d.profile!.equip, equipSince: today } }),
      (d) => ({ ...d, profile: { ...d.profile!, ...was } }))
    setCheck(null)
  }
  const neverKind = (k: EquipKind) => changeEquip({ ...p.equip, [k]: 'never' }, (n) => `No more ${kindLabel(k)}.${n ? ` Swapped ${lifts(n)} for ones you use.` : ''}`)
  const fewerKind = (k: EquipKind) => changeEquip({ ...p.equip, [k]: stepDown(kindUse(p, k)) }, () => `Fewer ${kindLabel(k)} from now on.`)
  const stopAsking = () => { update((d) => ({ ...d, settings: { ...d.settings, askSkips: false } })); setCheck(null) }

  const finish = () => {
    const invalid = exState.findIndex((s) => s.bad.some(Boolean))
    if (invalid >= 0) {
      go(invalid + 1)
      setValidation('Check the entered sets before finishing. Each needs a weight of 0 or more and reps greater than 0.')
      return
    }
    const entries: LogEntry[] = items.map(({ ex }) => {
      const logged = todaysLog?.entries.find((e) => e.exId === ex.id)
      const rpeStr = draft.rpe?.[ex.id] ?? (logged ? String(logged.sets[logged.sets.length - 1]?.rpe ?? '') : '')
      const s = exState[items.findIndex((i) => i.ex.id === ex.id)]
      const sets = s.rows.filter((_, j) => s.counted[j])
        .map((r) => ({ weight: Number(r.weight), reps: Number(r.reps), rpe: undefined as number | undefined }))
      if (data.settings.rpeEnabled && rpeStr && sets.length) sets[sets.length - 1].rpe = Number(rpeStr)
      return { exId: ex.id, name: ex.name, sets, note: draft.notes[ex.id] ?? logged?.note ?? '' }
    }).filter((x) => x.sets.length)
    // share the finished workout to the crew once per day; later "Save changes" taps just update the log
    const autoCrews = data.settings.autoShare && entries.length ? autoShareCrews(data).filter((id) => !data.workoutPosted?.[postedKey(today, id, data.primary)]) : []
    const willPost = autoCrews.length > 0
    const finishedAt = todaysLog?.finishedAt ?? Date.now()
    const minutes = todaysLog?.minutes ?? (started ? Math.max(1, Math.round(Math.min(Date.now() - started, data.settings.maxWorkoutHours * 3600000) / 60000)) : undefined)
    const rotationDay = todaysLog?.rotationDay ?? dayTypeFor(today, data.profile!, data.logs)
    const sum = summarize({
      title: sessionName, date: today, finishedAt, minutes, entries, history: data.logs, dayType: plan.day,
      streak: streak({ ...data, checkins: { ...data.checkins, [today]: { going: true, done: true } } }, today), place: data.settings.gymName,
    })
    update((d) => {
      const { [today]: _gone, ...drafts } = d.drafts
      void _gone
      return {
        ...d, drafts, workoutPosted: willPost ? { ...d.workoutPosted, ...Object.fromEntries(autoCrews.map((id) => [postedKey(today, id, d.primary), true])) } : d.workoutPosted,
        logs: [...d.logs.filter((l) => !(l.date === today && !l.baseline)), { date: today, dayType: plan.day, rotationDay, short, entries, finishedAt, minutes }],
        checkins: { ...d.checkins, [today]: { going: true, done: true } },
      }
    })
    if (willPost) {
      const shared = workoutPost(sum, entries, plan.day, data.settings.shareLifts !== false, { at: finishedAt, place: data.settings.postPlace })
      setSharedTo(autoCrews)
      void postTo(autoCrews, { kind: 'workout', text: shared.text, meta: shared.meta }).then(({ errors }) => {
        // a crew that did not get it can be tried again from Share this workout
        if (errors.length) update((d) => ({ ...d, workoutPosted: Object.fromEntries(Object.entries(d.workoutPosted ?? {}).filter(([k]) => !errors.some((e) => k === postedKey(today, e.id, d.primary)))) }))
      })
    }
    timer.stop()
    setSaved(true)
    // offer to save what they just did as their Leg Day (or update it), unless they turned that off or it is already saved that way
    const focus = data.workoutFocus?.[today]
    const ids = entries.map((e) => e.exId)
    if (!todaysLog && data.settings.askSave !== false && plan.day !== 'Rest/Cardio' && focus !== 'custom' && ids.length >= 2) {
      const existing = (data.myWorkouts ?? []).find((w) => w.day === plan.day && w.focus === focus)
      const same = existing && existing.ids.length === ids.length && existing.ids.every((id) => ids.includes(id))
      if (!same) {
        const taken = new Set((data.myWorkouts ?? []).map((w) => w.name.toLowerCase()))
        let name = existing?.name ?? savedName(plan.day, focus)
        for (let n = 2; !existing && taken.has(name.toLowerCase()); n++) name = `${savedName(plan.day, focus)} ${n}`
        setSaveOffer({ kind: existing ? 'update' : 'new', name, ids, day: plan.day, focus, existing: existing?.id })
      }
    }
    if (todaysLog) setTimeout(() => nav('/'), 900)
    else setSummary(sum)
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
  const onTouchStart = (e: React.TouchEvent) => { touch.current = (e.target as HTMLElement).closest('input, button, textarea, select, details, [data-noswipe]') ? null : { x: e.touches[0].clientX, y: e.touches[0].clientY } }
  const onTouchEnd = (e: React.TouchEvent) => {
    const t = touch.current; touch.current = null
    if (!t) return
    const dx = e.changedTouches[0].clientX - t.x, dy = e.changedTouches[0].clientY - t.y
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6) go(dx < 0 ? page + 1 : page - 1)
  }

  const DaySheet = sheet?.kind === 'day' && (
    <Sheet title="Change today's workout" onClose={() => setSheet(null)}>
      <p className="small mute">Change this session while keeping your usual weekly plan.</p>
      <div className="train-session-choices">{sessionChoices(suggested, data.myWorkouts ?? []).map((choice) => <button key={choice.id} onClick={() => (choice.id === 'build' ? setSheet({ kind: 'build' }) : chooseDay(choice.day, choice.focus, choice.ids))}>{choice.label}</button>)}</div>
    </Sheet>
  )
  const BuildSheet = sheet?.kind === 'build' && (
    <Sheet title="Build your own workout" onClose={() => setSheet(null)}>
      <BuildOwn data={data} ids={buildIds} setIds={setBuildIds} onStart={() => chooseDay('Full Body', 'custom', buildIds)}
        onSave={(name, ids) => update((d) => ({ ...d, myWorkouts: [...(d.myWorkouts ?? []), { id: `w${Date.now()}`, name, ids }] }))} />
    </Sheet>
  )

  const UndoNote = undo && <p className="workout-undo" role="status">{undo.label}{undo.restore && <button type="button" onClick={() => { update(undo.restore!); setUndo(null) }}>Undo</button>}{undo.tune && <button type="button" onClick={() => { setUndo(null); setFixEquip(true) }}>Not your equipment? Tune it</button>}</p>
  const ex = page >= 1 && page <= items.length ? items[page - 1] : null
  const st = ex ? exState[page - 1] : null
  const nextSet = st ? st.completed.findIndex((done) => !done) : -1
  const enteredSets = exState.reduce((sum, s) => sum + s.counted.filter(Boolean).length, 0)
  const pendingSets = exState.reduce((sum, s) => sum + s.counted.filter((c, i) => c && !s.completed[i]).length, 0)

  return (
    <div className="workout-session">
      {resharing && todaysLog && <ShareWorkoutSheet log={todaysLog} onClose={() => setResharing(false)} />}
      {summary && <DoneSheet summary={summary} settings={data.settings} onPrefs={(patch) => update((d) => ({ ...d, settings: { ...d.settings, ...patch } }))} onClose={() => nav('/')}
        extra={<>
          {sharedTo.length > 0 && <p className="small ok-text" role="status">Shared to {sharedTo.map((id) => myCrews.find((c) => c.id === id)?.name ?? 'your crew').join(' and ')}.</p>}
          {saveOffer && <SaveOfferCard offer={saveOffer}
          onSave={() => update((d) => ({ ...d, myWorkouts: saveOffer.existing
            ? (d.myWorkouts ?? []).map((w) => (w.id === saveOffer.existing ? { ...w, ids: saveOffer.ids } : w))
            : [...(d.myWorkouts ?? []), { id: `w${Date.now()}`, name: saveOffer.name, ids: saveOffer.ids, day: saveOffer.day, focus: saveOffer.focus }] }))}
          onNever={() => update((d) => ({ ...d, settings: { ...d.settings, askSave: false } }))} />}
        </>} />}
      <header className="workout-header">
        <button className="icon-button" aria-label="Back to Today" onClick={() => nav('/')}><Icon name="back" /></button>
        <div className="workout-header-title"><b>{sessionName} session</b><span>{short ? 'Short session' : todaysLog ? 'Edit workout' : 'Training'}</span></div>
        {started && !todaysLog ? <SessionElapsed since={started} /> : <Icon name="weight" />}
      </header>
      <div className="workout-progress" role="tablist" aria-label="Workout progress">
        {Array.from({ length: pageCount }, (_, i) => {
          const isEx = i >= 1 && i <= items.length
          const done = isEx && exState[i - 1].done
          const sets = isEx ? exState[i - 1].completed : []
          const fill = done ? 100 : sets.length ? Math.round((sets.filter(Boolean).length / sets.length) * 100) : 0
          return <button key={i} role="tab" aria-selected={i === page} className={`${i === page ? 'on' : ''} ${done ? 'done' : ''}`} style={{ '--fill': `${fill}%` } as React.CSSProperties} aria-label={i === 0 ? 'Warm-up' : i === pageCount - 1 ? 'Finish' : items[i - 1].ex.name} onClick={() => go(i)} />
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
              <p className="small mute" style={{ margin: '0 0 8px' }}>Built for your goal: <b>{GOALS[p.goal]}</b>{(p.focus?.length ?? 0) > 0 && <> · extra work for <b>{BODY_AREAS.filter((a) => p.focus!.includes(a.id)).map((a) => a.label.toLowerCase()).join(', ')}</b></>}. <Link to="/settings" style={{ textDecoration: 'underline' }}>Change</Link></p>
              {items.length > 0 && <p className="small mute train-reorder-hint">{items.length > 1 ? 'Press and hold a lift, then drag it up or down to change the order. ' : ''}Swipe a lift left to remove it, or right to keep it and add a new one after it.</p>}
              <ReorderList label="Today's lifts" items={items} getKey={(x) => x.ex.id} onReorder={reorderToday}>{(it, i) => (
                <SwipeRow className="tile" leftLabel="Remove" rightLabel="Add new" onLeft={() => removeLift(it)} onRight={() => addAfter(it)}>
                  <button className="minirow" onClick={() => go(i + 1)}>
                    <span className="thumbs"><Thumb id={it.ex.id} /></span>
                    <span style={{ flex: 1, textAlign: 'left' }}><b>{it.ex.name}</b><br /><span className="small mute">{it.sets} × {it.ex.reps[0]}–{it.ex.reps[1]}</span></span>
                    <span className={`tag ${exState[i].done ? 'ok' : ''}`}>{exState[i].done ? <Icon name="check" /> : <Icon name="chevron" />}</span>
                  </button>
                </SwipeRow>
              )}</ReorderList>
              {UndoNote}
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
            {ex.focus && <p className="small focus-note">{ex.focus}</p>}
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
              <p className="workout-ask"><b>Your goal:</b> {st.rows.length} sets of {ex.ex.reps[0]}–{ex.ex.reps[1]} reps{st.rec.weight ? <> at about <b>{st.rec.weight} lb</b></> : null}. Stop each set 1–2 reps before you can’t do another.</p>
              {!swipeSeen && <SwipeDemo onDismiss={seeSwipe} />}
              <div className="workout-set-head"><span>Set</span><span>Weight / lb</span><span>Reps ({ex.ex.reps[0]}–{ex.ex.reps[1]})</span><span /></div>
              {st.rows.map((r, i) => (
                <SwipeRow key={i} rightLabel="Log set" leftLabel="Delete" onRight={st.completed[i] ? undefined : () => { seeSwipe(); logSet(ex.ex.id, st.base, i, restFor(ex.ex, data.settings.rest), ex.ex.name) }} onLeft={() => { seeSwipe(); removeSet(ex.ex.id, st.base, i, defReps(ex.ex)) }}>
                <div className={`workout-set-row ${i === nextSet ? 'current' : ''} ${st.completed[i] ? 'completed' : ''}`}>
                  <span className="n">{i + 1}</span>
                  <input id={`set-${ex.ex.id}-${i}-weight`} type="number" min="0" step="any" inputMode="decimal" aria-label={`Set ${i + 1} weight`} value={r.weight} onChange={(e) => edit(ex.ex.id, st.base, i, 'weight', e.target.value)} placeholder="—" />
                  <input id={`set-${ex.ex.id}-${i}-reps`} type="number" min="1" inputMode="numeric" aria-label={`Set ${i + 1} reps`} value={r.reps} onChange={(e) => edit(ex.ex.id, st.base, i, 'reps', e.target.value)} placeholder={`${ex.ex.reps[0]}–${ex.ex.reps[1]}`} />
                  <button className={`set-check ${st.completed[i] ? 'done' : ''}`} aria-label={st.completed[i] ? `Set ${i + 1} logged` : `Log set ${i + 1}`} aria-pressed={st.completed[i]} onClick={() => logSet(ex.ex.id, st.base, i, restFor(ex.ex, data.settings.rest), ex.ex.name)}><Icon name="check" /></button>
                </div>
                </SwipeRow>
              ))}
              {swipeSeen && <p className="small mute workout-swipe-hint">Swipe a set right to log it, left to delete it.</p>}
            </div>
            <div className="workout-set-tools">
              <button className="quiet-button" onClick={() => addSet(ex.ex.id, st.base, defReps(ex.ex))}><Icon name="plus" />Add set</button>
              <button className="icon-button" aria-label="Not for me" onClick={() => setSheet({ kind: 'dislike', exId: ex.ex.id })}><Icon name="thumbDown" /></button>
              <button className="icon-button" aria-label="Exercise options" onClick={() => setSheet({ kind: 'options', exId: ex.ex.id })}><Icon name="more" /></button>
            </div>
            {validation && <p className="workout-validation" role="alert">{validation}</p>}
            {UndoNote}

            {data.settings.rpeEnabled && st.rows.length > 0 && st.completed[st.rows.length - 1] && (
              <details className="workout-rpe" onToggle={(e) => { const el = e.currentTarget; if (el.open) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60) }}>
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
              <ReorderList label="Exercises in this workout" items={items} getKey={(x) => x.ex.id} onReorder={reorderToday}>{(it, i) => (
                <SwipeRow className="tile" leftLabel="Remove" rightLabel="Add new" onLeft={() => removeLift(it)} onRight={() => addAfter(it)}>
                  <button className="minirow" onClick={() => go(i + 1)}>
                    <span style={{ flex: 1, textAlign: 'left' }}>{it.ex.name}</span>
                    <span className={`tag ${exState[i].done ? 'ok' : ''}`}>{exState[i].counted.filter(Boolean).length} sets{exState[i].done && <Icon name="check" />}</span>
                  </button>
                </SwipeRow>
              )}</ReorderList>
              {UndoNote}
              <button className="ghost" onClick={() => setSheet({ kind: 'add' })}><Icon name="plus" />Add an exercise</button>
            </section>
            {cardio && <section className="card"><h3>Optional cardio finisher</h3><p>{cardio}</p><Link className="btn ghost" to="/log">Log cardio</Link></section>}
            {todaysLog && todaysLog.entries.some((e) => e.sets.length) && <button className="ghost" onClick={() => setResharing(true)}>Share this workout</button>}
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
      {BuildSheet}
      {sheet?.kind === 'dislike' && (() => {
        const item = items.find((it) => it.ex.id === sheet.exId)
        if (!item) return null
        return (
          <Sheet title="Not for me?" onClose={() => setSheet(null)}>
            <h3>{item.ex.name}</h3>
            <p className="small mute">Tell us what to do with this lift. Nothing is ever hidden unless you choose it here.</p>
            <button className="ghost sheet-choice" onClick={() => { removeLift(item); setSheet(null) }}><b>Not today</b><span className="small mute">Skip it for this workout only</span></button>
            <button className="ghost sheet-choice" onClick={() => { neverShow(item); setSheet(null) }}><b>Never show me this</b><span className="small mute">Hide it everywhere. You can bring it back in Settings.</span></button>
          </Sheet>
        )
      })()}
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
              {state.rows.map((row, i) => <div className="row" key={i}><span>Set {i + 1}{state.counted[i] || state.completed[i] ? ` · ${row.weight} lb × ${row.reps}` : validSet(row) ? ` · ${row.weight} lb × ${row.reps} (not logged)` : ''}</span><button className="icon-button" aria-label={`Delete set ${i + 1}`} onClick={() => dropSet(item.ex.id, state.base, i, defReps(item.ex))}><Icon name="close" /></button></div>)}
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
      {check && (() => {
        const read = readSkips(skippedExs, p, check.atGym)
        const names = skippedExs.map((x) => x.name)
        const list = names.length > 3 ? `${names.slice(0, 3).join(', ')} and ${names.length - 3} more` : names.length === 3 ? `${names[0]}, ${names[1]} and ${names[2]}` : names.join(' and ')
        return (
          <Sheet title="Skipping a few lifts?" onClose={() => setCheck(null)}>
            <p className="small mute">You’ve skipped {list}.</p>
            {read.kind === 'where' && <>
              <h3>Are you at the gym today?</h3>
              <button className="ghost sheet-choice" onClick={goHome}><b>I’m at home</b><span className="small mute">Swap the rest for dumbbell and bodyweight lifts.</span></button>
              <button className="ghost sheet-choice" onClick={() => setCheck({ atGym: true })}><b>I’m at the gym</b><span className="small mute">These lifts just aren’t for me today.</span></button>
            </>}
            {read.kind === 'equip' && <>
              <h3>Want fewer {kindLabel(read.equip)}?</h3>
              {kindUse(p, read.equip) === 'often' && <button className="ghost sheet-choice" onClick={() => fewerKind(read.equip)}><b>Fewer {kindLabel(read.equip)}</b><span className="small mute">Still in your plans now and then.</span></button>}
              <button className="ghost sheet-choice" onClick={() => neverKind(read.equip)}><b>Never use {kindLabel(read.equip)}</b><span className="small mute">Swap the rest of today and keep them out of your plans.</span></button>
            </>}
            {read.kind === 'mixed' && <>
              <h3>Is your equipment set up right?</h3>
              <button className="ghost sheet-choice" onClick={() => { setCheck(null); setFixEquip(true) }}><b>Tune my equipment</b><span className="small mute">Say what you use, and your plans follow it.</span></button>
            </>}
            <button className="ghost" onClick={() => setCheck(null)}>Keep going</button>
            <button className="quiet-action" onClick={stopAsking}>Don’t ask me this again</button>
          </Sheet>
        )
      })()}
      {fixEquip && <EquipmentSheet gear={p.gear} equip={p.equip} onClose={() => setFixEquip(false)} onSkip={() => setFixEquip(false)}
        onSave={(equip) => { setFixEquip(false); changeEquip(equip, (n) => `Equipment updated.${n ? ` Swapped ${lifts(n)} for ones you use.` : ''} Your next workouts follow it.`) }} />}
      {sheet?.kind === 'swap' && (() => {
        const cur = items.find((i) => i.ex.id === sheet.cur)?.ex
        const opts = cur ? swapOptions(cur, planIds, here, historyOf(data)) : []
        return (
          <Sheet title={`Swap ${cur?.name ?? ''}`} onClose={() => setSheet(null)}>
            <ExerciseFinder best like={cur} pool={opts} onPick={(o) => swapTo(sheet.orig, sheet.cur, o.id)} />
          </Sheet>
        )
      })()}
      {sheet?.kind === 'add' && (
        <Sheet title="Add an exercise" onClose={() => setSheet(null)}>
          <ExerciseFinder best prefer={plan.day} pool={addableExercises(planIds, here, historyOf(data), plan.day)} onPick={(o) => addEx(o.id)} />
        </Sheet>
      )}
    </div>
  )
}
