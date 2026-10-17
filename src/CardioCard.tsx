import { Link } from 'react-router-dom'
import { useApp } from './store'
import { cardioFinisher, dayFor, todayISO } from './engine'
import { cardioName, goalProgress, weekCardio } from './cardio'

/** The Cardio section of the Train page, under the workout: start a timer, log one, and this week's progress. */
export function CardioCard() {
  const { data } = useApp()
  const today = todayISO()
  const active = data.cardioActive
  const wk = weekCardio(data, today)
  const goal = data.cardioGoal ? goalProgress(data, data.cardioGoal, today) : null
  const suggestion = data.profile?.cardio ? cardioFinisher(data.profile, dayFor(today, data)) : null
  return (
    <section className="card cardio-card" aria-labelledby="cardio-card-title">
      <h3 id="cardio-card-title">Cardio</h3>
      {active
        ? <p>{active.pausedAt ? 'Paused' : 'Running'}: {cardioName(active)}</p>
        : suggestion && <p className="small mute">Suggested today: {suggestion}</p>}
      <p className="small mute">{goal ? goal.line : wk.sessions ? `${wk.sessions} ${wk.sessions === 1 ? 'session' : 'sessions'} · ${wk.minutes} min this week` : 'StairMaster, elliptical, treadmill and more. Time it, or log one you did.'}</p>
      <div className="row wrap">
        <Link className="btn primary" to="/cardio">{active ? 'Open timer' : 'Start cardio'}</Link>
        <Link className="btn ghost" to="/cardio?log=1">Log one</Link>
      </div>
    </section>
  )
}
