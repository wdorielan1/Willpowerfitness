import { useState } from 'react'
import { useApp } from '../store'
import { carbDayFor, dayFor, macroPlan, MEALS, todayISO } from '../engine'
import { GOALS } from '../data'
import type { CarbDay } from '../types'

export default function Nutrition() {
  const { data, update } = useApp()
  const p = data.profile!
  const today = todayISO()
  const plan = macroPlan(p)
  const suggested = carbDayFor(dayFor(today, data))
  const [sel, setSel] = useState<CarbDay>(suggested)
  const m = plan[sel]
  const checked = data.meals[today] ?? []
  const toggle = (id: string) => update((d) => ({ ...d, meals: { ...d.meals, [today]: checked.includes(id) ? checked.filter((x) => x !== id) : [...checked, id] } }))
  const meals = MEALS[sel]
  const done = meals.filter((x) => checked.includes(x.id)).length

  return (
    <>
      <div><h1>Fuel</h1><p className="mute">{GOALS[p.goal]} plan · estimates, not medical advice.</p></div>
      <div className="tabs">
        {(['low', 'medium', 'high'] as CarbDay[]).map((k) => <button key={k} className={sel === k ? 'on' : ''} onClick={() => setSel(k)}>{k[0].toUpperCase() + k.slice(1)} carb</button>)}
      </div>
      <p className="small mute">Suggested for today: <b>{suggested}</b> carb, based on your workout.</p>
      <section className="card hero">
        <div className="row"><h2>{m.cal} kcal</h2><span className="tag accent">{sel} carb day</span></div>
        <div className="grid3">
          <div className="stat"><b>{m.p}g</b><span>protein</span></div>
          <div className="stat"><b>{m.c}g</b><span>carbs</span></div>
          <div className="stat"><b>{m.f}g</b><span>fats</span></div>
        </div>
      </section>
      <section className="card">
        <div className="row"><h3>Daily check-in</h3><span className="tag">{done}/{meals.length}</span></div>
        {meals.map((x) => (
          <button key={x.id} className="row full" style={{ background: checked.includes(x.id) ? '#12301f' : undefined, textAlign: 'left' }} onClick={() => toggle(x.id)}>
            <span><b>{x.name}</b><br /><span className="small mute">{x.example}</span></span>
            <span>{checked.includes(x.id) ? '✓' : '○'}</span>
          </button>
        ))}
      </section>
    </>
  )
}
