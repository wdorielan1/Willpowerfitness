import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../store'
import { useCheckin } from '../actions'
import { dayFor, fmtTime, streak, todayISO } from '../engine'
import Qotd from './Qotd'
import { WorkoutClock } from '../components'
import { ENCOURAGEMENTS } from '../data'
import { roster, stats, useCrew } from './Crew'
import { useLiveCrew } from '../cloud'

export default function Dashboard() {
  const { data, userId } = useApp()
  const p = data.profile!
  const ci = useCheckin()
  const crew = useCrew()
  const today = todayISO()
  const nav = useNavigate()
  const day = dayFor(today, data)
  const logged = data.logs.some((l) => l.date === today && !l.baseline)
  const rest = day === 'Rest/Cardio'
  const s = streak(data)
  const live = useLiveCrew(crew?.id ?? null, userId)
  const g = !crew ? null : live ? { pct: live.members ? Math.round((live.done / live.members) * 100) : 0, done: live.done, members: live.members } : stats(crew, ci.done)
  const who = !crew ? [] : live ? live.people.map((x) => ({ ...x, name: x.mine ? `${x.name} (you)` : x.name })) : roster(crew, today, ci.going ? { name: data.name || 'You', going: true, done: ci.done } : undefined)
  const quote = ENCOURAGEMENTS[new Date().getDate() % ENCOURAGEMENTS.length]
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <>
      <div>
        <p className="mute">{greet}, {data.name || 'lifter'}</p>
        <h1>{ci.done ? 'Done. That is how it is done.' : rest ? 'Recovery day.' : `Today: ${day}.`}</h1>
      </div>

      <section className="card hero">
        <div className="row">
          <span className="tag accent">{rest ? 'Rest / cardio' : 'Today’s workout'}</span>
          <span className="tag">🔥 {s} day streak</span>
        </div>
        <div className="row">
          <div><b style={{ fontSize: 22 }}>{day}</b><div className="mute small">Committed to {fmtTime(p.time)}{crew ? ` · ${crew.name}` : ''}</div></div>
        </div>
        {ci.started && !ci.done && !rest && <WorkoutClock since={ci.started} />}
        {!ci.done && (rest
          ? <Link to="/workout" className="btn primary full">See cardio plan</Link>
          : <button className="primary full" onClick={() => { if (!ci.started) ci.start(); nav('/workout') }}>{ci.started ? '▶ Continue workout' : '▶ Start workout'}</button>)}
        {!ci.done && <Link to="/workout?change=1" className="small mute" style={{ textAlign: 'center', textDecoration: 'underline' }}>Not feeling {day}? Change today’s workout</Link>}
        {ci.done && logged && <Link to="/workout" className="small mute" style={{ textAlign: 'center', textDecoration: 'underline' }}>Edit today’s logged sets</Link>}
        <div className="grid2">
          <button className={ci.going ? 'good' : 'primary'} disabled={ci.going} onClick={ci.imGoing}>{ci.going ? '✓ I’m going' : 'I’m going'}</button>
          <button className={ci.done ? 'good' : ''} onClick={ci.done ? ci.undo : ci.complete}>{ci.done ? '✓ Complete' : 'Workout complete'}</button>
        </div>
        <p className="small mute">“{quote}”</p>
      </section>

      {crew && g ? (
        <section className="card">
          <div className="row"><h2>{crew.name}</h2><Link to="/crew" className="small mute">Switch</Link></div>
          <div className="row small"><span>Group completion today</span><b>{g.pct}%</b></div>
          <div className="bar"><i style={{ width: `${g.pct}%` }} /></div>
          <p className="small mute">{g.done} of {g.members} members checked in</p>
          <h3>Training today</h3>
          {live && who.length === 0 && <p className="small mute">Nobody has checked in yet. Be the first.</p>}
          <div className="people">
            {who.map((w) => (
              <div className="person" key={w.name}>
                <span className={`avatar ${w.status}`}>{w.name[0]}</span>
                <span className="grow">{w.name}</span>
                <span className={`tag ${w.status === 'done' ? 'ok' : 'accent'}`}>{w.status === 'done' ? 'Done' : 'Going'}</span>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="card">
          <span className="tag">Solo mode</span>
          <h2>Training on your own</h2>
          <p className="mute small">Your workouts, logs and streak all work without a crew. Join one anytime if you want company.</p>
          <Link to="/crew" className="btn ghost">Browse crews (optional)</Link>
        </section>
      )}
      {crew && <Qotd crewId={crew.id} live={live} />}

      <div className="grid2">
        <Link to="/log" className="stat"><b>＋</b><span>Log cardio or body weight</span></Link>
        <Link to="/shortcuts" className="stat"><b>🎙</b><span>Set up Siri wake-up</span></Link>
      </div>
    </>
  )
}
