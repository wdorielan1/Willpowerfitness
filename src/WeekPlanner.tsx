import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from './store'
import { fromISO, generateWorkout, todayISO, weekSchedule, workoutName, type WeekDay } from './engine'
import { Sheet } from './components'
import { ShareWorkoutSheet } from './pages/Feed'
import { WeekStrip, useWeekMove } from './WeekStrip'
import { EditWeek } from './EditWeek'
import type { DayType, WorkoutLog } from './types'

/**
 * This week's plan, the same on Home and Train: the seven days (press and hold a day and drag it to move it), "Edit week" to set
 * any day directly, and a tap on a day to see its workout, move it or share it. With `onMakeUp` (the Train page) a missed day
 * also offers to do that workout today or to skip it.
 */
export function WeekPlanner({ onMakeUp }: { onMakeUp?: (day: DayType) => void }) {
  const { data, update } = useApp()
  const nav = useNavigate()
  const today = todayISO()
  const week = weekSchedule(data, today)
  const completedThisWeek = week.filter((d) => d.status === 'done').length
  const [peek, setPeek] = useState<WeekDay | null>(null)
  const [sharing, setSharing] = useState<WorkoutLog | null>(null)
  const [editing, setEditing] = useState(false)
  const mover = useWeekMove(week, today)
  const missed = week.filter((w) => w.status === 'missed')
  const next = week.find((w) => w.status === 'today' || w.status === 'upcoming')
  const name = (d: DayType) => (d === 'Rest/Cardio' ? 'Rest' : workoutName(d))
  const skip = (w: WeekDay) => { update((d) => ({ ...d, logs: [...d.logs, { date: w.date, dayType: w.planned, short: false, entries: [], skipped: true }].sort((a, b) => a.date.localeCompare(b.date)) })); setPeek(null) }

  return (
    <>
      <section className="week-summary" aria-label="This week’s training">
        <div className="section-head"><h2>This week</h2><span className="week-head-actions"><span>{completedThisWeek === 0 ? 'No sessions logged' : `${completedThisWeek} ${completedThisWeek === 1 ? 'session' : 'sessions'} logged`}</span><button type="button" className="quiet-action" onClick={() => setEditing(true)}>Edit week</button></span></div>
        <WeekStrip week={week} today={today} mover={mover} onOpen={setPeek} />
      </section>
      {onMakeUp && missed.length > 0 && (
        <div className="rec repeat">
          <b>You missed {missed.map((m) => `${name(m.planned)} (${m.label})`).join(', ')}.</b>
          <div className="small">Nothing is lost. Your plan keeps it next in line{next ? `, so ${next.status === 'today' ? 'today' : next.label} is ${name(next.planned)}` : ''}. Or tap the day to make it up now or skip it.</div>
        </div>
      )}
      {sharing && <ShareWorkoutSheet log={sharing} onClose={() => setSharing(null)} />}
      {editing && <EditWeek week={week} today={today} onClose={() => setEditing(false)} />}
      {peek && (() => {
        const dayName = fromISO(peek.date).toLocaleDateString(undefined, { weekday: 'long' })
        const rest = peek.planned === 'Rest/Cardio'
        const preview = rest ? [] : generateWorkout(peek.date, data, false, peek.planned).items
        const logged = peek.logged && !peek.logged.skipped && !peek.logged.baseline ? peek.logged : null
        return (
          <Sheet title={`${dayName} · ${rest ? 'Recovery' : workoutName(peek.planned)}`} onClose={() => setPeek(null)}>
            <p className="small mute">{peek.status === 'done' ? 'Done. Here is what you logged.' : peek.status === 'missed' ? 'Missed. It comes back as your next workout.' : peek.status === 'skipped' ? 'Skipped.' : peek.date === today ? 'Today’s plan.' : 'Planned. This can change as you train.'}</p>
            {rest ? <p>Recovery day. Easy walk or bike, stretch, and rest up.</p> : logged ? (
              <div className="people">{logged.entries.map((e) => <div className="person" key={e.exId}><span className="grow"><b>{e.name}</b></span><span className="small mute">{e.sets.length} sets · best {Math.max(...e.sets.map((x) => x.weight))} lb</span></div>)}</div>
            ) : (
              <div className="people">{preview.map((it) => <div className="person" key={it.ex.id}><span className="grow"><b>{it.ex.name}</b><br /><span className="small mute">{it.ex.muscle}</span></span><span className="small mute">{it.sets} × {it.ex.reps[0]}–{it.ex.reps[1]}</span></div>)}</div>
            )}
            {logged && logged.entries.some((e) => e.sets.length) && !logged.imported && <button className="ghost week-sheet-share" onClick={() => { setPeek(null); setSharing(logged) }}>Share this workout</button>}
            {mover.rules.from.has(peek.date) && <div className="week-sheet-move">
              <h3>Move this workout</h3>
              <p className="small mute">Swaps it with the day you pick. A rest day takes it and this day becomes a rest day.</p>
              <div className="chips">{week.filter((w) => mover.rules.to.has(w.date) && w.date !== peek.date).map((w) => <button type="button" key={w.date} className="chip" onClick={() => { mover.move(peek.date, w.date); setPeek(null) }}>{w.label} · {name(w.planned)}</button>)}</div>
            </div>}
            {onMakeUp && peek.status === 'missed' && <div className="week-sheet-move">
              <h3>Make it up?</h3>
              <button type="button" className="primary" onClick={() => { onMakeUp(peek.planned); setPeek(null) }}>Do {name(peek.planned)} today</button>
              <button type="button" className="ghost" onClick={() => setPeek(null)}>Let it roll to my next workout</button>
              <button type="button" className="ghost" onClick={() => skip(peek)}>Skip it and move on</button>
            </div>}
            {!onMakeUp && peek.date === today && !rest && peek.status !== 'done' && <button className="primary" onClick={() => { setPeek(null); nav('/workout') }}>Go to today’s workout</button>}
          </Sheet>
        )
      })()}
    </>
  )
}
