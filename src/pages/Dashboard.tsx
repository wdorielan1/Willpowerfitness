import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../store'
import { useCheckin } from '../actions'
import { carbPlanFor, dayFor, fmtTime, fromISO, generateWorkout, macroPlan, restFor, todayISO, weekSchedule, workoutName, type WeekDay } from '../engine'
import { greeting } from '../greeting'
import { Avatar, ConfirmSheet, Sheet, fmtClock } from '../components'
import { useCrew } from './Crew'
import { useLiveCrew } from '../cloud'
import { Icon } from '../icons'
import type { DayType } from '../types'
import { summaryFromLog } from '../shareCard'
import { DoneSheet } from '../WorkoutShare'

const sessionDescription: Record<DayType, string> = {
  Push: 'Chest, shoulders & triceps',
  Pull: 'Back & biceps',
  Legs: 'Quads, hamstrings & glutes',
  'Shoulders/Abs': 'Shoulders & core',
  'Full Body': 'A little of everything',
  'Rest/Cardio': 'Easy movement. Time to recover.',
}

function SessionElapsed({ since }: { since: number }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])
  return <span className="session-elapsed"><Icon name="clock" />{fmtClock(now - since)} elapsed</span>
}

/** "Good evening, Will" at the top of the page. It re-reads the clock every minute so it changes on its own at 5, 12, 17 and 22 o'clock. */
function Greeting({ name, done, rest }: { name: string; done: boolean; rest: boolean }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t) }, [])
  return <p className="greeting">{greeting(now, name, { done, rest })}</p>
}

export default function Dashboard() {
  const { data, update, userId, avatarUrl } = useApp()
  const p = data.profile!
  const ci = useCheckin()
  const crew = useCrew()
  const today = todayISO()
  const nav = useNavigate()
  const day = dayFor(today, data)
  const todaysLog = data.logs.find((l) => l.date === today && !l.baseline && !l.skipped)
  // the time you actually finished, not the time you planned to train
  const shareSummary = todaysLog ? summaryFromLog(data, todaysLog) : null
  const [sharing, setSharing] = useState(false)
  const [askUndo, setAskUndo] = useState(false)
  const finishedLabel = todaysLog?.finishedAt ? new Date(todaysLog.finishedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''
  const rest = day === 'Rest/Cardio'
  const plan = generateWorkout(today, data, !!data.short[today])
  const estimatedMinutes = Math.round(plan.items.reduce((minutes, item) => minutes + item.sets * (restFor(item.ex, data.settings.rest) + 40), 0) / 60 / 5) * 5
  const nutrition = carbPlanFor(today, data)
  const targets = macroPlan(p, data.settings.nutrition)[nutrition.carb]
  const food = (data.foodLog[today] ?? []).reduce((total, entry) => ({ cal: total.cal + entry.cal, p: total.p + entry.p }), { cal: 0, p: 0 })
  const focus = data.workoutFocus?.[today]
  const sessionName = workoutName(day, focus)
  const week = weekSchedule(data, today)
  const completedThisWeek = week.filter((d) => d.status === 'done').length
  const live = useLiveCrew(crew?.id ?? null, userId)
  const people = live?.people ?? (ci.going ? [{ name: data.name || 'You', status: ci.done ? 'done' as const : 'going' as const, mine: true }] : [])
  const [peek, setPeek] = useState<WeekDay | null>(null)
  const start = () => {
    ci.start()
    nav('/workout')
  }

  return (
    <>
      <Greeting name={data.name} done={ci.done} rest={rest} />
      <section className="week-summary" aria-label="This week’s training">
        <div className="section-head"><h2>This week</h2><span>{completedThisWeek === 0 ? 'No sessions logged' : `${completedThisWeek} ${completedThisWeek === 1 ? 'session' : 'sessions'} logged`}</span></div>
        <div className="week-strip">
          {week.map((d) => <button type="button" className={`week-day status-${d.status}${d.date === today ? ' is-today' : ''}`} key={d.date} onClick={() => setPeek(d)} title={`${d.label}: ${d.planned} · ${d.status}`} aria-label={`${d.label}, ${d.planned}, ${d.status}${d.date === today ? ', today' : ''}. Tap to see the workout.`}>
            <span aria-hidden="true">{d.label[0]}</span>
            <span className="week-day-dot" aria-hidden="true">{d.status === 'done' && <Icon name="check" />}</span>
            <span className="week-day-plan" aria-hidden="true">{d.planned === 'Rest/Cardio' ? 'Rest' : d.planned === 'Shoulders/Abs' ? 'Sh/Abs' : d.planned === 'Full Body' ? 'Full' : d.planned}</span>
          </button>)}
        </div>
      </section>

      {data.profile && !data.profile.sex && (
        <section className="card">
          <h3>Tune your plan</h3>
          <p className="small mute">Tell us your sex and the body parts you want to focus on. It sizes your calories and adds extra work where you want it.</p>
          <Link to="/settings" className="primary" style={{ textDecoration: 'none', textAlign: 'center' }}>Update my plan</Link>
        </section>
      )}

      <div className="today-heading">
        <p className="overline">{ci.done ? 'TODAY’S SESSION' : rest ? 'YOUR RECOVERY' : 'YOUR NEXT SESSION'}</p>
        <h1>{ci.done ? <>{todaysLog ? 'Workout logged.' : 'Workout complete.'}</> : rest ? <>Recovery<br />day.</> : <>Your next<br />workout.</>}</h1>
      </div>

      <section className="session-card" aria-label="Today’s workout">
        <div className="session-topline">
          <span className="section-label">{ci.done ? 'COMPLETE' : ci.started && !rest ? 'IN PROGRESS' : 'PLANNED'}{ci.done ? (finishedLabel ? ` · ${finishedLabel}` : '') : ` · ${fmtTime(p.time)}`}</span>
          <span className="icon-surface"><Icon name={ci.done ? 'check' : 'weight'} /></span>
        </div>
        <h2 className="session-heading">{rest ? 'Recovery' : sessionName}</h2>
        <p className="session-subtitle">{focus ? (focus === 'chest-triceps' ? 'Chest & triceps · today’s choice' : 'Back & biceps · today’s choice') : sessionDescription[day]}</p>
        {!rest && <div className="session-meta">
          <span><Icon name="weight" />{plan.items.length} {plan.items.length === 1 ? 'exercise' : 'exercises'}</span>
          {ci.started && !ci.done
            ? <SessionElapsed since={ci.started} />
            : todaysLog?.minutes
              ? <span><Icon name="clock" />{todaysLog.minutes} min logged</span>
              : estimatedMinutes > 0 && <span><Icon name="clock" />About {estimatedMinutes} min</span>}
        </div>}

        {ci.done
          ? <Link to="/workout" className="btn primary session-primary">{todaysLog ? 'View logged workout' : 'View workout'}<Icon name="arrow" /></Link>
          : rest
            ? <Link to="/workout" className="btn primary session-primary">See recovery plan<Icon name="arrow" /></Link>
            : <button className="primary session-primary" onClick={start}>{ci.started ? 'Resume workout' : 'Start workout'}<Icon name="arrow" /></button>}

        {ci.done && shareSummary && <button className="ghost" onClick={() => setSharing(true)}>Share this workout</button>}

        <div className="session-secondary">
          {!ci.done && <Link to="/workout?change=1" className="quiet-action">Change workout</Link>}
          {ci.done && todaysLog && <Link to="/workout" className="quiet-action">Edit logged sets</Link>}
          {ci.done && <button className="quiet-action" onClick={() => setAskUndo(true)}>Undo completion</button>}
        </div>

      </section>

      {crew ? <section className="crew-summary" aria-label="Your crew">
        <div className="crew-summary-top">
          <span className="icon-surface"><Icon name="crew" /></span>
          <div className="grow"><h2>{crew.name}</h2><p className="crew-summary-meta">{fmtTime(crew.time)} training time</p></div>
          <Link to="/crew" className="icon-button" aria-label={`Open ${crew.name}`}><Icon name="chevron" /></Link>
        </div>
        {live && live.members > 0 && <p className="crew-summary-meta">{live.done} of {live.members} {live.members === 1 ? 'member' : 'members'} completed today</p>}
        {people.length > 0 ? <div className="crew-summary-people">
          {people.slice(0, 3).map((person, i) => <div className="crew-summary-person" key={`${person.name}-${i}`}>
            <Avatar className={person.status} name={person.name} url={person.mine ? avatarUrl : (person as { avatar?: string | null }).avatar} />
            <span className="grow">{person.name}{person.mine ? ' (you)' : ''}</span>
            <span className="small mute">{person.status === 'done' ? 'Done' : 'Training today'}</span>
          </div>)}
          {people.length > 3 && <Link to="/crew" className="quiet-action">View all check-ins</Link>}
        </div> : <p className="crew-summary-meta">No check-ins to show yet.</p>}
        {!live && <p className="crew-summary-meta">Your check-in is saved on this device.</p>}
      </section> : <Link to="/crew" className="crew-summary crew-summary-link">
        <span className="icon-surface"><Icon name="crew" /></span>
        <div className="grow"><h2>Find your crew</h2><p className="crew-summary-meta">People who train when you do.</p></div>
        <Icon name="chevron" />
      </Link>}

      <div className="dashboard-shortcuts">
        <Link to="/log" className="quiet-action"><Icon name="plus" />Quick log</Link>
        <Link to="/shortcuts" className="quiet-action"><Icon name="clock" />Siri shortcuts</Link>
      </div>

      <section className="today-nutrition" aria-label="Today’s nutrition">
        <div className="section-head"><h2>Today’s nutrition</h2><Link to="/nutrition" className="quiet-action">Open<Icon name="chevron" /></Link></div>
        <p className="today-nutrition-plan">{nutrition.carb[0].toUpperCase() + nutrition.carb.slice(1)} carb day · {data.settings.nutrition.meals} meals</p>
        <div className="today-nutrition-targets">
          <div><span>Calories</span><p><b>{Math.round(food.cal).toLocaleString()}</b> / {targets.cal.toLocaleString()}</p></div>
          <div><span>Protein</span><p><b>{Math.round(food.p)}g</b> / {targets.p}g</p></div>
        </div>
        <Link to="/nutrition" className="quiet-action"><Icon name="plus" />Log a meal</Link>
      </section>
      {askUndo && <ConfirmSheet title="Undo completion?" message="This marks today’s workout as not done, which can lower your streak. Your logged sets are kept, and you can finish the workout again anytime." confirmLabel="Yes, undo it" onConfirm={() => { setAskUndo(false); ci.undo() }} onCancel={() => setAskUndo(false)} />}
      {sharing && shareSummary && <DoneSheet summary={shareSummary} settings={data.settings} onPrefs={(patch) => update((d) => ({ ...d, settings: { ...d.settings, ...patch } }))} onClose={() => setSharing(false)} />}
      {peek && (() => {
        const dayName = fromISO(peek.date).toLocaleDateString(undefined, { weekday: 'long' })
        const rest = peek.planned === 'Rest/Cardio'
        const preview = rest ? [] : generateWorkout(peek.date, data, false, peek.planned).items
        const logged = peek.logged && !peek.logged.skipped && !peek.logged.baseline ? peek.logged : null
        return (
          <Sheet title={`${dayName} · ${rest ? 'Recovery' : workoutName(peek.planned)}`} onClose={() => setPeek(null)}>
            <p className="small mute">{peek.status === 'done' ? 'Done. Here is what you logged.' : peek.status === 'missed' ? 'Missed. It comes back as your next workout.' : peek.date === today ? 'Today’s plan.' : 'Planned. This can change as you train.'}</p>
            {rest ? <p>Recovery day. Easy walk or bike, stretch, and rest up.</p> : logged ? (
              <div className="people">{logged.entries.map((e) => <div className="person" key={e.exId}><span className="grow"><b>{e.name}</b></span><span className="small mute">{e.sets.length} sets · best {Math.max(...e.sets.map((x) => x.weight))} lb</span></div>)}</div>
            ) : (
              <div className="people">{preview.map((it) => <div className="person" key={it.ex.id}><span className="grow"><b>{it.ex.name}</b><br /><span className="small mute">{it.ex.muscle}</span></span><span className="small mute">{it.sets} × {it.ex.reps[0]}–{it.ex.reps[1]}</span></div>)}</div>
            )}
            {peek.date === today && !rest && peek.status !== 'done' && <button className="primary" onClick={() => { setPeek(null); nav('/workout') }}>Go to today’s workout</button>}
          </Sheet>
        )
      })()}
    </>
  )
}
