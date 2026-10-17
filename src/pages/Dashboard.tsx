import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../store'
import { useCheckin } from '../actions'
import { carbPlanFor, dayFor, fromISO, generateWorkout, macroPlan, todayISO, weekSchedule, workoutName, type WeekDay } from '../engine'
import { greeting } from '../greeting'
import { Sheet } from '../components'
import { Icon } from '../icons'
import type { WorkoutLog } from '../types'
import { FeedComposer, HomeFeed, ShareWorkoutSheet } from './Feed'
import { WeekPlanner } from '../WeekPlanner'
import { useMyCrews } from '../CrewPicker'
import { HomePeople } from '../HomePeople'

/** "Good evening, Will" at the top of the page. It re-reads the clock every minute so it changes on its own at 5, 12, 17 and 22 o'clock. */
function Greeting({ name, done, rest }: { name: string; done: boolean; rest: boolean }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t) }, [])
  return <p className="greeting">{greeting(now, name, { done, rest })}</p>
}

export default function Dashboard() {
  const { data, update } = useApp()
  const p = data.profile!
  const ci = useCheckin()
  const crews = useMyCrews()
  const today = todayISO()
  const nav = useNavigate()
  const rest = dayFor(today, data) === 'Rest/Cardio'
  const nutrition = carbPlanFor(today, data)
  const targets = macroPlan(p, data.settings.nutrition)[nutrition.carb]
  const food = (data.foodLog[today] ?? []).reduce((total, entry) => ({ cal: total.cal + entry.cal, p: total.p + entry.p }), { cal: 0, p: 0 })
  const [justHid, setJustHid] = useState(false)
  const setHidden = (hideNutrition: boolean) => update((d) => ({ ...d, settings: { ...d.settings, hideNutrition } }))

  return (
    <>
      <Greeting name={data.name} done={ci.done} rest={rest} />
      {crews.length > 0 && <FeedComposer crewId={data.primary && crews.some((c) => c.id === data.primary) ? data.primary : crews[0].id} />}
      <WeekPlanner />

      {data.profile && !data.profile.sex && (
        <section className="card">
          <h3>Tune your plan</h3>
          <p className="small mute">Tell us your sex and the body parts you want to focus on. It sizes your calories and adds extra work where you want it.</p>
          <Link to="/settings" className="primary" style={{ textDecoration: 'none', textAlign: 'center' }}>Update my plan</Link>
        </section>
      )}

      {/* a widget: anyone can hide it (Settings brings it back); later it can sit behind premium */}
      {!data.settings.hideNutrition
        ? <section className="today-nutrition" aria-label="Today’s nutrition">
            <div className="section-head"><h2>Today’s nutrition</h2><span className="today-nutrition-actions"><Link to="/nutrition" className="quiet-action">Open<Icon name="chevron" /></Link><button type="button" className="quiet-action" aria-label="Hide nutrition from Home" onClick={() => { setHidden(true); setJustHid(true) }}><Icon name="close" size={16} /></button></span></div>
            <p className="today-nutrition-plan">{nutrition.carb[0].toUpperCase() + nutrition.carb.slice(1)} carb day · {data.settings.nutrition.meals} meals</p>
            <div className="today-nutrition-targets">
              <div><span>Calories</span><p><b>{Math.round(food.cal).toLocaleString()}</b> / {targets.cal.toLocaleString()}</p></div>
              <div><span>Protein</span><p><b>{Math.round(food.p)}g</b> / {targets.p}g</p></div>
            </div>
            <Link to="/nutrition" className="quiet-action"><Icon name="plus" />Log a meal</Link>
          </section>
        : justHid && <p className="small mute today-nutrition-hidden" role="status">Nutrition is hidden from Home. Bring it back in Settings. <button type="button" className="quiet-action" onClick={() => { setHidden(false); setJustHid(false) }}>Undo</button></p>}

      <HomePeople />
      <HomeFeed />

    </>
  )
}
