import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ConfirmSheet, Sheet } from '../components'
import { useApp } from '../store'
import { CARDIO_SESSION_MIN, cardioFinisher, dayFor, fromISO, todayISO } from '../engine'
import {
  DEFAULT_MACHINE, DEFAULT_MODE, GOAL_DAY_MINUTES, GOAL_MILES, MACHINES, SESSION_NOTE, UNIT_LABEL,
  cardioName, clockText, elapsedMs, goalProgress, goalText, machineOf, newCardioId, sameLog, shouldOfferGoal, weekCardio,
} from '../cardio'
import type { CardioGoal, CardioLog } from '../types'

const dayLabel = (date: string) => fromISO(date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
const miles = (n?: number) => (n ? ` · ${Math.round(n * 10) / 10} mi` : '')

/** Pick the machine; the treadmill also asks how it was used (walk, incline, run or sprints). */
function MachinePicker({ kind, mode, onKind, onMode }: { kind: string; mode: string; onKind: (k: string) => void; onMode: (m: string) => void }) {
  const machine = MACHINES.find((m) => m.id === kind)
  const legacy = !machine // an older session keeps its old kind (like "Incline walk") when edited
  return (
    <>
      <div className="chips" role="group" aria-label="Machine">
        {legacy && <button type="button" className="chip on" aria-pressed="true">{kind}</button>}
        {MACHINES.map((m) => <button type="button" key={m.id} className={`chip ${kind === m.id ? 'on' : ''}`} aria-pressed={kind === m.id} onClick={() => onKind(m.id)}>{m.id}</button>)}
      </div>
      {machine?.modes && <div className="chips" role="group" aria-label={`${kind} mode`}>
        {machine.modes.map((m) => <button type="button" key={m} className={`chip ${mode === m ? 'on' : ''}`} aria-pressed={mode === m} onClick={() => onMode(m)}>{m}</button>)}
      </div>}
    </>
  )
}

interface Draft { kind: string; mode: string; minutes: string; date: string; speed: string; incline: string; level: string; miles: string; note: string }
const draftOf = (c: Partial<CardioLog> | undefined, today: string): Draft => ({
  kind: c?.kind ?? DEFAULT_MACHINE, mode: c?.mode ?? (c?.kind && c.kind !== 'Treadmill' ? '' : DEFAULT_MODE), minutes: c?.minutes ? String(c.minutes) : '', date: c?.date ?? today,
  speed: c?.speed != null ? String(c.speed) : '', incline: c?.incline != null ? String(c.incline) : '', level: c?.level != null ? String(c.level) : '', miles: c?.miles != null ? String(c.miles) : '', note: c?.note ?? '',
})

const LIMITS = { speed: 30, incline: 40, level: 100, miles: 200 }
function toLog(d: Draft, today: string, base: Partial<CardioLog>, source: 'manual' | 'timer'): CardioLog | string {
  const minutes = Math.round(Number(d.minutes))
  if (!(minutes >= 1) || minutes > 600) return 'Enter the minutes, from 1 to 600.'
  if (!d.date || d.date > today) return 'Pick today or an earlier day.'
  const machine = machineOf(d.kind)
  const out: CardioLog = { ...base, date: d.date, kind: d.kind, minutes, note: d.note.trim(), source: base.source ?? source, id: base.id ?? newCardioId() }
  out.mode = machine.modes ? d.mode || undefined : undefined
  for (const f of ['speed', 'incline', 'level', 'miles'] as const) {
    const raw = d[f].trim().replace(/,/g, '')
    if (!machine.fields.includes(f) || raw === '') { delete out[f]; continue }
    const n = Number(raw)
    if (!Number.isFinite(n) || n < 0 || n > LIMITS[f]) return `${UNIT_LABEL[f]} should be a number from 0 to ${LIMITS[f]}.`
    out[f] = n
  }
  return out
}

/** The log form: used to log one you already did, to finish the timer, and to edit an older session. */
function CardioSheet({ title, initial, base = {}, source, note, onSave, onDelete, onClose }: {
  title: string; initial?: Partial<CardioLog>; base?: Partial<CardioLog>; source: 'manual' | 'timer'; note?: string
  onSave: (log: CardioLog) => void; onDelete?: () => void; onClose: () => void
}) {
  const today = todayISO()
  const [d, setD] = useState(() => draftOf(initial, today))
  const [err, setErr] = useState('')
  const machine = machineOf(d.kind)
  const set = (patch: Partial<Draft>) => { setD((cur) => ({ ...cur, ...patch })); setErr('') }
  const hasDetails = machine.fields.some((f) => d[f] !== '')
  const save = () => { const r = toLog(d, today, base, source); if (typeof r === 'string') setErr(r); else onSave(r) }
  return (
    <Sheet title={title} onClose={onClose}>
      {note && <p className="small mute">{note}</p>}
      <MachinePicker kind={d.kind} mode={d.mode} onKind={(k) => set({ kind: k, mode: k === 'Treadmill' ? d.mode || DEFAULT_MODE : '' })} onMode={(m) => set({ mode: m })} />
      <div className="grid2">
        <label>Minutes<input inputMode="numeric" value={d.minutes} onChange={(e) => set({ minutes: e.target.value.replace(/[^0-9]/g, '') })} placeholder="30" /></label>
        <label>Day<input type="date" max={today} value={d.date} onChange={(e) => set({ date: e.target.value })} /></label>
      </div>
      {Number(d.minutes) >= CARDIO_SESSION_MIN && <p className="small ok-text">This counts as a workout day.</p>}
      <details className="cardio-details" open={hasDetails}>
        <summary>More details (optional)</summary>
        <div className="grid2">
          {machine.fields.map((f) => <label key={f}>{UNIT_LABEL[f]}<input inputMode="decimal" value={d[f]} onChange={(e) => set({ [f]: e.target.value.replace(/[^0-9.]/g, '') } as Partial<Draft>)} /></label>)}
        </div>
      </details>
      <label>Notes<input value={d.note} onChange={(e) => set({ note: e.target.value })} placeholder="How it felt" /></label>
      {err && <p role="alert" className="err small">{err}</p>}
      <button type="button" className="primary" onClick={save}>Save</button>
      {onDelete && <button type="button" className="link-danger" onClick={onDelete}>Delete this session</button>}
    </Sheet>
  )
}

/** Weekly goal: some days of at least so many minutes, or miles. Their choice; it is offered after a couple of sessions, never at sign-up. */
function GoalSheet({ goal, onSave, onRemove, onClose }: { goal?: CardioGoal; onSave: (g: CardioGoal) => void; onRemove: () => void; onClose: () => void }) {
  const [kind, setKind] = useState<'days' | 'miles'>(goal?.kind ?? 'days')
  const [days, setDays] = useState(goal?.kind === 'days' ? goal.days : 3)
  const [minutes, setMinutes] = useState(goal?.kind === 'days' ? goal.minutes : 30)
  const [mi, setMi] = useState(goal?.kind === 'miles' ? String(goal.miles) : '10')
  const miNum = Number(mi)
  const ok = kind === 'days' || (miNum > 0 && miNum <= 500)
  return (
    <Sheet title="Weekly cardio goal" onClose={onClose}>
      <p className="small mute">Your choice, and you can change or remove it any time. The week runs Monday to Sunday.</p>
      <div className="chips" role="group" aria-label="Goal type">
        <button type="button" className={`chip ${kind === 'days' ? 'on' : ''}`} aria-pressed={kind === 'days'} onClick={() => setKind('days')}>Days a week</button>
        <button type="button" className={`chip ${kind === 'miles' ? 'on' : ''}`} aria-pressed={kind === 'miles'} onClick={() => setKind('miles')}>Miles a week</button>
      </div>
      {kind === 'days' ? (
        <>
          <h3>How many days?</h3>
          <div className="chips" role="group" aria-label="Days a week">{[1, 2, 3, 4, 5, 6, 7].map((n) => <button type="button" key={n} className={`chip ${days === n ? 'on' : ''}`} aria-pressed={days === n} onClick={() => setDays(n)}>{n}</button>)}</div>
          <h3>How long each day?</h3>
          <div className="chips" role="group" aria-label="Minutes each day">{GOAL_DAY_MINUTES.map((n) => <button type="button" key={n} className={`chip ${minutes === n ? 'on' : ''}`} aria-pressed={minutes === n} onClick={() => setMinutes(n)}>{n} min</button>)}</div>
        </>
      ) : (
        <>
          <h3>How many miles?</h3>
          <div className="chips" role="group" aria-label="Miles a week">{GOAL_MILES.map((n) => <button type="button" key={n} className={`chip ${miNum === n ? 'on' : ''}`} aria-pressed={miNum === n} onClick={() => setMi(String(n))}>{n}</button>)}</div>
          <label>Or type your own<input inputMode="decimal" value={mi} onChange={(e) => setMi(e.target.value.replace(/[^0-9.]/g, ''))} /></label>
          <p className="small mute">Only sessions where you log the miles count toward this.</p>
        </>
      )}
      <button type="button" className="primary" disabled={!ok} onClick={() => onSave(kind === 'days' ? { kind: 'days', days, minutes } : { kind: 'miles', miles: Math.round(miNum * 10) / 10 })}>Save goal</button>
      {goal && <button type="button" className="link-danger" onClick={onRemove}>Remove my goal</button>}
    </Sheet>
  )
}

export default function Cardio() {
  const { data, update } = useApp()
  const nav = useNavigate()
  const [sp, setSp] = useSearchParams()
  const today = todayISO()
  const [kind, setKind] = useState(DEFAULT_MACHINE)
  const [mode, setMode] = useState(DEFAULT_MODE)
  const [sheet, setSheet] = useState<null | { kind: 'log' } | { kind: 'finish'; minutes: number; long: boolean } | { kind: 'edit'; log: CardioLog } | { kind: 'goal' }>(null)
  const [askDiscard, setAskDiscard] = useState(false)
  const [askDelete, setAskDelete] = useState<CardioLog | null>(null)
  const [shown, setShown] = useState(10)
  const [msg, setMsg] = useState('')
  const [now, setNow] = useState(() => Date.now())
  const active = data.cardioActive
  const running = !!active && !active.pausedAt

  useEffect(() => { if (sp.get('log')) { setSheet({ kind: 'log' }); setSp({}, { replace: true }) } }, [sp, setSp])
  useEffect(() => {
    if (!running) return
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [running])

  const day = data.profile ? dayFor(today, data) : null
  const suggestion = data.profile && day ? cardioFinisher(data.profile, day) : null
  const wk = weekCardio(data, today)
  const goal = data.cardioGoal ? goalProgress(data, data.cardioGoal, today) : null

  const start = () => update((d) => ({ ...d, cardioActive: { kind, mode: kind === 'Treadmill' ? mode : undefined, startedAt: Date.now(), pausedMs: 0 } }))
  const pause = () => update((d) => (d.cardioActive && !d.cardioActive.pausedAt ? { ...d, cardioActive: { ...d.cardioActive, pausedAt: Date.now() } } : d))
  const resume = () => update((d) => (d.cardioActive?.pausedAt ? { ...d, cardioActive: { ...d.cardioActive, pausedMs: d.cardioActive.pausedMs + (Date.now() - d.cardioActive.pausedAt), pausedAt: undefined } } : d))
  const finish = () => {
    if (!active) return
    const ms = elapsedMs({ ...active, pausedAt: active.pausedAt ?? Date.now() })
    pause() // the clock stops while they fill it in; closing the sheet leaves it paused with Resume
    setSheet({ kind: 'finish', minutes: Math.min(180, Math.max(1, Math.round(ms / 60000))), long: ms > 3 * 3600_000 })
  }
  const saved = (log: CardioLog, timer = false) => {
    update((d) => ({ ...d, cardio: [...d.cardio, log], ...(timer ? { cardioActive: undefined } : {}) }))
    setSheet(null)
    setMsg(log.minutes >= CARDIO_SESSION_MIN ? `Saved. ${log.date === today ? 'Today counts' : 'That day counts'} as a workout day.` : 'Saved.')
  }
  const edited = (old: CardioLog, next: CardioLog) => {
    update((d) => { const i = d.cardio.findIndex((c) => sameLog(c, old)); return i < 0 ? d : { ...d, cardio: d.cardio.map((c, j) => (j === i ? next : c)) } })
    setSheet(null); setMsg('Saved.')
  }
  const remove = (old: CardioLog) => {
    update((d) => { const i = d.cardio.findIndex((c) => sameLog(c, old)); return i < 0 ? d : { ...d, cardio: d.cardio.filter((_, j) => j !== i) } })
    setAskDelete(null); setSheet(null); setMsg('Deleted.')
  }

  const history = data.cardio.map((c, i) => ({ c, i })).sort((a, b) => b.c.date.localeCompare(a.c.date) || b.i - a.i).map((x) => x.c)

  return (
    <>
      <h1>Cardio</h1>

      {active ? (
        <section className="card cardio-active" aria-label="Cardio session in progress">
          <p className="overline">{active.pausedAt ? 'Paused' : 'In progress'}</p>
          <h2>{cardioName(active)}</h2>
          <div className="cardio-clock" role="timer" aria-label="Time so far">{clockText(elapsedMs(active, now))}</div>
          <div className="row wrap">
            {active.pausedAt ? <button type="button" className="ghost" onClick={resume}>Resume</button> : <button type="button" className="ghost" onClick={pause}>Pause</button>}
            <button type="button" className="primary" onClick={finish}>Finish</button>
          </div>
          <button type="button" className="link-danger" onClick={() => setAskDiscard(true)}>Discard this session</button>
        </section>
      ) : (
        <section className="card">
          <h2>Start a session</h2>
          {suggestion && <p className="small mute">Suggested today: {suggestion}</p>}
          <MachinePicker kind={kind} mode={mode} onKind={setKind} onMode={setMode} />
          <button type="button" className="primary" onClick={start}>Start timer</button>
          <button type="button" className="ghost" onClick={() => setSheet({ kind: 'log' })}>Log one I already did</button>
          <p className="small mute">{SESSION_NOTE(CARDIO_SESSION_MIN)}</p>
        </section>
      )}
      {msg && <p className="ok-text" role="status">✓ {msg}</p>}

      {shouldOfferGoal(data) && (
        <section className="rec start" role="group" aria-label="Weekly cardio goal">
          <b>Want a weekly cardio goal?</b>
          <span className="small">Pick days a week and how long each day, or miles a week. You can change or remove it any time.</span>
          <div className="row wrap">
            <button type="button" className="primary small-btn" onClick={() => setSheet({ kind: 'goal' })}>Set a goal</button>
            <button type="button" className="ghost small-btn" onClick={() => update((d) => ({ ...d, cardioGoalAsked: today }))}>Not now</button>
          </div>
        </section>
      )}

      {(data.cardio.length > 0 || goal) && (
        <section className="card" aria-labelledby="cardio-week-title">
          <div className="row"><h3 id="cardio-week-title">This week</h3>
            {data.cardio.length > 0 && <button type="button" className="quiet-action" onClick={() => setSheet({ kind: 'goal' })}>{data.cardioGoal ? 'Change goal' : 'Set a goal'}</button>}</div>
          {goal && data.cardioGoal && <>
            <div className="cardio-goal-bar" role="progressbar" aria-label="Weekly cardio goal" aria-valuemin={0} aria-valuemax={goal.target} aria-valuenow={Math.min(goal.done, goal.target)}><span style={{ width: `${Math.min(100, Math.round((goal.done / goal.target) * 100))}%` }} /></div>
            <p className="small">{goal.line}{goal.reached ? ' · Goal reached' : ''}</p>
            <p className="small mute">Goal: {goalText(data.cardioGoal)}</p>
          </>}
          <p className="small mute">{wk.sessions ? `${wk.sessions} ${wk.sessions === 1 ? 'session' : 'sessions'} · ${wk.minutes} min so far` : 'No cardio logged yet this week.'}</p>
        </section>
      )}

      <section className="card" aria-labelledby="cardio-history-title">
        <h3 id="cardio-history-title">Your cardio</h3>
        {history.length ? <div className="cardio-history">
          {history.slice(0, shown).map((c, i) => (
            <button type="button" key={c.id ?? `${c.date}-${i}`} className="cardio-row" onClick={() => setSheet({ kind: 'edit', log: c })} aria-label={`Edit ${cardioName(c)}, ${dayLabel(c.date)}, ${c.minutes} minutes`}>
              <span><b>{cardioName(c)}</b><time dateTime={c.date}>{dayLabel(c.date)}</time></span>
              <span>{c.minutes} min{miles(c.miles)}</span>
            </button>
          ))}
        </div> : <p className="small mute">Nothing yet. Start a timer, or log one you already did.</p>}
        {history.length > shown && <button type="button" className="progress-more" onClick={() => setShown(shown + 10)}>Show {Math.min(10, history.length - shown)} more</button>}
      </section>

      <section className="card">
        <h3>Want to lift too?</h3>
        <p className="small mute">Cardio and a workout can share the same day. Pick a workout and it is added to today.</p>
        <button type="button" className="ghost" onClick={() => nav('/workout?change=1')}>Add a workout</button>
      </section>

      {sheet?.kind === 'log' && <CardioSheet title="Log cardio" source="manual" onSave={(l) => saved(l)} onClose={() => setSheet(null)} />}
      {sheet?.kind === 'finish' && active && <CardioSheet title="Finish session" source="timer" initial={{ kind: active.kind, mode: active.mode, minutes: sheet.minutes }}
        note={sheet.long ? 'The timer ran for a long time. Set the minutes you really did.' : 'Check the minutes, then save.'} onSave={(l) => saved(l, true)} onClose={() => setSheet(null)} />}
      {sheet?.kind === 'edit' && <CardioSheet title="Edit cardio" source="manual" initial={sheet.log} base={sheet.log} onSave={(l) => edited(sheet.log, l)} onDelete={() => setAskDelete(sheet.log)} onClose={() => setSheet(null)} />}
      {sheet?.kind === 'goal' && <GoalSheet goal={data.cardioGoal} onClose={() => setSheet(null)}
        onSave={(g) => { update((d) => ({ ...d, cardioGoal: g, cardioGoalAsked: today })); setSheet(null); setMsg('Goal saved.') }}
        onRemove={() => { update((d) => ({ ...d, cardioGoal: undefined, cardioGoalAsked: today })); setSheet(null) }} />}
      {askDiscard && <ConfirmSheet title="Discard this session?" message="The time so far will not be saved." confirmLabel="Discard" onConfirm={() => { update((d) => ({ ...d, cardioActive: undefined })); setAskDiscard(false) }} onCancel={() => setAskDiscard(false)} />}
      {askDelete && <ConfirmSheet title="Delete this session?" message="It is removed from your history and can't be recovered." confirmLabel="Yes, delete it" onConfirm={() => remove(askDelete)} onCancel={() => setAskDelete(null)} />}
    </>
  )
}
