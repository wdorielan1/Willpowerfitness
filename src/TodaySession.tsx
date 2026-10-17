import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from './store'
import { useCheckin } from './actions'
import { dayFor, fmtTime, generateWorkout, restFor, todayISO, workoutName } from './engine'
import { ConfirmSheet, fmtClock } from './components'
import { Icon } from './icons'
import { summaryFromLog } from './shareCard'
import { ShareWorkoutSheet } from './pages/Feed'
import type { DayType } from './types'

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

/**
 * "Your next workout": today's session as one big card, with start, resume, change, share and undo. It lives at the top of the
 * Train page. `onChange` is what "Change workout" does there (the page scrolls to its own list of workouts).
 */
export function TodaySession({ onChange, beforeStart }: { onChange?: () => void; /** Runs first when Start is tapped, with the function that really starts (the Train page uses it for the first-time equipment question). */ beforeStart?: (go: () => void) => void }) {
  const { data, update } = useApp()
  const ci = useCheckin()
  const nav = useNavigate()
  const p = data.profile!
  const today = todayISO()
  const day = dayFor(today, data)
  const todaysLog = data.logs.find((l) => l.date === today && !l.baseline && !l.skipped)
  const shareSummary = todaysLog ? summaryFromLog(data, todaysLog) : null
  const [sharing, setSharing] = useState(false)
  const [askUndo, setAskUndo] = useState(false)
  // the time you actually finished, not the time you planned to train
  const finishedLabel = todaysLog?.finishedAt ? new Date(todaysLog.finishedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''
  const rest = day === 'Rest/Cardio'
  const plan = generateWorkout(today, data, !!data.short[today])
  const estimatedMinutes = Math.round(plan.items.reduce((minutes, item) => minutes + item.sets * (restFor(item.ex, data.settings.rest) + 40), 0) / 60 / 5) * 5
  const focus = data.workoutFocus?.[today]
  const sessionName = workoutName(day, focus)
  const go = () => { ci.start(); nav('/workout') }
  const start = () => { if (beforeStart) beforeStart(go); else go() }

  return (
    <>
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

        {ci.done && shareSummary && todaysLog && <button className="ghost" onClick={() => setSharing(true)}>Share this workout</button>}

        <div className="session-secondary">
          {!ci.done && (onChange ? <button type="button" className="quiet-action" onClick={onChange}>Change workout</button> : <Link to="/workout?change=1" className="quiet-action">Change workout</Link>)}
          {ci.done && todaysLog && <Link to="/workout" className="quiet-action">Edit logged sets</Link>}
          {ci.done && <button className="quiet-action" onClick={() => setAskUndo(true)}>Undo completion</button>}
        </div>
      </section>
      {askUndo && <ConfirmSheet title="Undo completion?" message="This marks today’s workout as not done, which can lower your streak. Your logged sets are kept, and you can finish the workout again anytime." confirmLabel="Yes, undo it" onConfirm={() => { setAskUndo(false); ci.undo() }} onCancel={() => setAskUndo(false)} />}
      {sharing && todaysLog && <ShareWorkoutSheet log={todaysLog} onClose={() => setSharing(false)} />}
    </>
  )
}
