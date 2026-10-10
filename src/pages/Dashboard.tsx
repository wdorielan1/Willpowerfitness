import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../store'
import { useCheckin } from '../actions'
import { carbPlanFor, dayFor, fmtTime, generateWorkout, macroPlan, restFor, todayISO, weekSchedule, workoutName } from '../engine'
import { fmtClock } from '../components'
import { useCrew } from './Crew'
import { useLiveCrew } from '../cloud'
import { Icon } from '../icons'
import type { DayType } from '../types'

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

export default function Dashboard() {
  const { data, userId } = useApp()
  const p = data.profile!
  const ci = useCheckin()
  const crew = useCrew()
  const today = todayISO()
  const nav = useNavigate()
  const day = dayFor(today, data)
  const todaysLog = data.logs.find((l) => l.date === today && !l.baseline && !l.skipped)
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
  const start = () => {
    ci.start()
    nav('/workout')
  }

  return (
    <>
      <section className="week-summary" aria-label="This week’s training">
        <div className="section-head"><h2>This week</h2><span>{completedThisWeek === 0 ? 'No sessions logged' : `${completedThisWeek} ${completedThisWeek === 1 ? 'session' : 'sessions'} logged`}</span></div>
        <div className="week-strip">
          {week.map((d) => <div className={`week-day status-${d.status}${d.date === today ? ' is-today' : ''}`} key={d.date} title={`${d.label}: ${d.planned} · ${d.status}`} aria-label={`${d.label}, ${d.planned}, ${d.status}${d.date === today ? ', today' : ''}`}>
            <span aria-hidden="true">{d.label[0]}</span>
            <span className="week-day-dot" aria-hidden="true">{d.status === 'done' && <Icon name="check" />}</span>
            <span className="week-day-plan" aria-hidden="true">{d.planned === 'Rest/Cardio' ? 'Rest' : d.planned === 'Shoulders/Abs' ? 'Sh/Abs' : d.planned === 'Full Body' ? 'Full' : d.planned}</span>
          </div>)}
        </div>
      </section>

      <div className="today-heading">
        <p className="overline">{ci.done ? 'TODAY’S SESSION' : rest ? 'YOUR RECOVERY' : 'YOUR NEXT SESSION'}</p>
        <h1>{ci.done ? <>{todaysLog ? 'Workout logged.' : 'Workout complete.'}</> : rest ? <>Recovery<br />day.</> : <>Your next<br />workout.</>}</h1>
      </div>

      <section className="session-card" aria-label="Today’s workout">
        <div className="session-topline">
          <span className="section-label">{ci.done ? 'COMPLETE' : ci.started && !rest ? 'IN PROGRESS' : 'PLANNED'} · {fmtTime(p.time)}</span>
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

        <div className="session-secondary">
          {!ci.done && <Link to="/workout?change=1" className="quiet-action">Change workout</Link>}
          {ci.done && todaysLog && <Link to="/workout" className="quiet-action">Edit logged sets</Link>}
          {ci.done && <button className="quiet-action" onClick={ci.undo}>Undo completion</button>}
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
            <span className={`avatar ${person.status}`}>{person.name[0]}</span>
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
    </>
  )
}
