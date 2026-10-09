import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../store'
import { Sheet } from '../components'
import { FOODS, FOOD_CATS, MEAL_NAMES, MEAL_SHARE } from '../foods'
import { addDays, carbPlanFor, fromISO, macroPlan, MEALS, projectDays, todayISO } from '../engine'
import { GOALS } from '../data'
import { solveMeal, sumPicks, type Pick } from '../mealgen'
import type { CarbDay, FoodEntry, FoodItem } from '../types'

const COLOR: Record<CarbDay, string> = { low: '#5aa9ff', medium: '#ffc247', high: '#ff4d2e' }
const r0 = (n: number) => Math.round(n)
const month = (ym: string) => fromISO(`${ym}-01`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

function Bar({ label, got, goal, unit }: { label: string; got: number; goal: number; unit: string }) {
  const pct = Math.min(100, goal ? (got / goal) * 100 : 0)
  const over = got > goal * 1.05
  return (
    <div style={{ display: 'grid', gap: 4 }}>
      <div className="row small"><b>{label}</b><span className={over ? 'err' : 'mute'}>{r0(got)} / {goal} {unit}{got <= goal ? ` · ${r0(goal - got)} left` : ` · ${r0(got - goal)} over`}</span></div>
      <div className="bar"><i style={{ width: `${pct}%`, background: over ? '#c62828' : undefined }} /></div>
    </div>
  )
}

export default function Nutrition() {
  const { data, update } = useApp()
  const p = data.profile!
  const today = todayISO()
  const n = data.settings.nutrition
  const plan = macroPlan(p, n)
  const proj = projectDays(data, today, 100)
  const planned = carbPlanFor(today, data, today, proj)
  const [sel, setSel] = useState<CarbDay>(planned.carb)
  const [picker, setPicker] = useState<number | null>(null) // meal index being added to
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<string>('Protein')
  const [custom, setCustom] = useState({ name: '', serving: '1 serving', cal: '', p: '', c: '', f: '' })
  const [ym, setYm] = useState(today.slice(0, 7))
  const [dayOpen, setDayOpen] = useState<string | null>(null)
  const [gen, setGen] = useState<number | null>(null) // meal being built
  const [chosen, setChosen] = useState<FoodItem[]>([])
  const [built, setBuilt] = useState<Pick[] | null>(null)
  const [gq, setGq] = useState('')

  const m = plan[sel]
  const names = MEAL_NAMES[n.meals] ?? MEAL_NAMES[4]
  const share = MEAL_SHARE[n.meals] ?? MEAL_SHARE[4]
  const entries = data.foodLog[today] ?? []
  const inMeal = (i: number) => entries.filter((e) => Math.min(e.meal, n.meals - 1) === i)
  const tot = entries.reduce((a, e) => ({ cal: a.cal + e.cal, p: a.p + e.p, c: a.c + e.c, f: a.f + e.f }), { cal: 0, p: 0, c: 0, f: 0 })

  const setN = (patch: Partial<typeof n>) => update((d) => ({ ...d, settings: { ...d.settings, nutrition: { ...d.settings.nutrition, ...patch } } }))
  const save = (fn: (list: FoodEntry[]) => FoodEntry[]) => update((d) => ({ ...d, foodLog: { ...d.foodLog, [today]: fn(d.foodLog[today] ?? []) } }))
  const addFood = (f: FoodItem, meal: number) =>
    save((l) => [...l, { id: `${Date.now()}${Math.random().toString(36).slice(2, 5)}`, meal, name: f.name, serving: f.serving, qty: 1, cal: f.cal, p: f.p, c: f.c, f: f.f }])
  const setQty = (e: FoodEntry, qty: number) => {
    if (qty <= 0) return save((l) => l.filter((x) => x.id !== e.id))
    const k = qty / e.qty
    save((l) => l.map((x) => (x.id === e.id ? { ...x, qty, cal: x.cal * k, p: x.p * k, c: x.c * k, f: x.f * k } : x)))
  }
  const saveCustom = () => {
    const num = (s: string) => Math.max(0, parseFloat(s) || 0)
    if (!custom.name.trim() || picker === null) return
    const item: FoodItem = { id: `mine-${Date.now()}`, name: custom.name.trim(), serving: custom.serving.trim() || '1 serving', cal: num(custom.cal) || num(custom.p) * 4 + num(custom.c) * 4 + num(custom.f) * 9, p: num(custom.p), c: num(custom.c), f: num(custom.f), cat: 'My foods' }
    update((d) => ({ ...d, customFoods: [...d.customFoods, item] }))
    addFood(item, picker)
    setCustom({ name: '', serving: '1 serving', cal: '', p: '', c: '', f: '' })
    setPicker(null)
  }

  const all = [...data.customFoods, ...FOODS]
  const planKey = (i: number) => `${sel}:${n.meals}:${i}`
  const target = (i: number) => ({ p: m.p * share[i], c: m.c * share[i], f: m.f * share[i] })
  const openGen = (i: number) => { setGen(i); setGq(''); setBuilt(null); setChosen((data.mealPlan[planKey(i)] ?? []).map((x) => x.item)) }
  const toggle = (f: FoodItem) => { setBuilt(null); setChosen((l) => (l.some((x) => x.id === f.id) ? l.filter((x) => x.id !== f.id) : [...l, f])) }
  const adjustBuilt = (idx: number, d: number) => setBuilt((l) => (l ? l.map((x, k) => (k === idx ? { ...x, qty: Math.max(0, Math.round((x.qty + d) * 4) / 4) } : x)).filter((x) => x.qty > 0) : l))
  const toEntries = (l: Pick[], meal: number): FoodEntry[] => l.map(({ item, qty }) => ({ id: `${Date.now()}${Math.random().toString(36).slice(2, 6)}`, meal, name: item.name, serving: item.serving, qty, cal: item.cal * qty, p: item.p * qty, c: item.c * qty, f: item.f * qty }))
  const savePlan = (i: number, l: Pick[]) => update((d) => ({ ...d, mealPlan: { ...d.mealPlan, [planKey(i)]: l } }))
  const logPlan = (i: number, l: Pick[]) => save((cur) => [...cur.filter((e) => Math.min(e.meal, n.meals - 1) !== i), ...toEntries(l, i)])
  const genResults = all.filter((f) => (gq.trim() ? f.name.toLowerCase().includes(gq.trim().toLowerCase()) : f.cat === cat))
  const results = all.filter((f) => (q.trim() ? f.name.toLowerCase().includes(q.trim().toLowerCase()) : f.cat === cat))

  // calendar
  const first = fromISO(`${ym}-01`)
  const lead = first.getDay()
  const dim = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const maxYm = addDays(today, 90).slice(0, 7)
  const shiftYm = (k: number) => { const x = new Date(first.getFullYear(), first.getMonth() + k, 1); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}` }
  const open = dayOpen ? carbPlanFor(dayOpen, data, today, proj) : null

  return (
    <>
      <div><h1>Fuel</h1><p className="mute">{GOALS[p.goal]} plan · estimates, not medical advice.</p></div>

      <div className="tabs">
        {(['low', 'medium', 'high'] as CarbDay[]).map((k) => <button key={k} className={sel === k ? 'on' : ''} onClick={() => setSel(k)}>{k[0].toUpperCase() + k.slice(1)} carb</button>)}
      </div>
      <p className="small mute">Today is planned as a <b style={{ color: COLOR[planned.carb] }}>{planned.carb}</b> carb day{planned.manual ? ' (set by you)' : ` (${planned.day === 'Rest/Cardio' ? 'rest day' : planned.day + ' day'})`}.
        {sel !== planned.carb && <> <button className="link-danger" style={{ color: 'var(--accent2)', padding: 0 }} onClick={() => update((d) => ({ ...d, carbOverride: { ...d.carbOverride, [today]: sel } }))}>Use {sel} for today</button></>}</p>

      <section className="card hero">
        <div className="row"><h2>{r0(m.cal)} kcal target</h2><Link to="/settings" className="small mute" style={{ textDecoration: 'underline' }}>Adjust</Link></div>
        <Bar label="Calories" got={tot.cal} goal={m.cal} unit="kcal" />
        <Bar label="Protein" got={tot.p} goal={m.p} unit="g" />
        <Bar label="Carbs" got={tot.c} goal={m.c} unit="g" />
        <Bar label="Fats" got={tot.f} goal={m.f} unit="g" />
        <p className="small mute">Targets: {m.p}g protein · {m.c}g carbs · {m.f}g fat. Change protein, fat, calories and meals in Settings.</p>
      </section>

      <div className="row"><h2>Meals</h2><div className="chips">{[2, 3, 4, 5, 6].map((k) => <button key={k} className={`chip ${n.meals === k ? 'on' : ''}`} onClick={() => setN({ meals: k })}>{k}</button>)}</div></div>
      {names.map((name, i) => {
        const list = inMeal(i)
        const sum = list.reduce((a, e) => ({ cal: a.cal + e.cal, p: a.p + e.p }), { cal: 0, p: 0 })
        return (
          <section className="card" key={name + i}>
            <div className="row"><h3>{name}</h3><span className="small mute">aim {r0(m.cal * share[i])} kcal · {r0(m.p * share[i])}g protein</span></div>
            {list.map((e) => (
              <div key={e.id} className="row small" style={{ background: 'var(--card2)', borderRadius: 12, padding: '8px 10px' }}>
                <span style={{ flex: 1 }}><b>{e.name}</b><br /><span className="mute">{e.qty} × {e.serving} · {r0(e.cal)} kcal · {r0(e.p)}P {r0(e.c)}C {r0(e.f)}F</span></span>
                <button className="ghost small-btn" onClick={() => setQty(e, Math.round((e.qty - 0.5) * 2) / 2)}>−</button>
                <button className="ghost small-btn" onClick={() => setQty(e, Math.round((e.qty + 0.5) * 2) / 2)}>＋</button>
              </div>
            ))}
            {list.length > 0 && <p className="small mute">This meal: {r0(sum.cal)} kcal · {r0(sum.p)}g protein</p>}
            <div className="row wrap">
              <button className="primary small-btn" onClick={() => { setPicker(i); setQ('') }}>＋ Add food</button>
              <button className="ghost small-btn" onClick={() => openGen(i)}>✨ Build this meal</button>
              {data.mealPlan[planKey(i)]?.length ? <button className="ghost small-btn" onClick={() => logPlan(i, data.mealPlan[planKey(i)])}>Use my saved meal</button> : null}
              <details><summary className="small mute" style={{ cursor: 'pointer' }}>Ideas</summary><div className="small" style={{ marginTop: 6 }}>{(MEALS[sel][Math.min(i, MEALS[sel].length - 1)]).example}</div></details>
            </div>
          </section>
        )
      })}

      <section className="card">
        <div className="row"><h2>🗓 Carb calendar</h2><div className="row" style={{ gap: 6 }}><button className="ghost small-btn" onClick={() => setYm(shiftYm(-1))}>‹</button><button className="ghost small-btn" onClick={() => setYm(shiftYm(1))} disabled={ym >= maxYm}>›</button></div></div>
        <div className="small" style={{ textAlign: 'center', fontWeight: 800 }}>{month(ym)}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, textAlign: 'center' }}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i} className="small mute">{d}</span>)}
          {Array.from({ length: lead }, (_, i) => <span key={'b' + i} />)}
          {Array.from({ length: dim }, (_, i) => {
            const date = `${ym}-${String(i + 1).padStart(2, '0')}`
            const c = carbPlanFor(date, data, today, proj)
            const isToday = date === today
            return (
              <button key={date} onClick={() => setDayOpen(date)} style={{ minHeight: 48, padding: '4px 0', borderRadius: 10, background: 'var(--card2)', border: isToday ? '2px solid var(--accent)' : '1px solid var(--line)', opacity: date < today ? 0.7 : 1, display: 'grid', gap: 2, justifyItems: 'center', fontSize: 13 }}>
                <span>{i + 1}</span>
                <span style={{ width: 10, height: 10, borderRadius: 99, background: COLOR[c.carb], outline: c.manual ? '2px solid #fff' : 'none' }} />
              </button>
            )
          })}
        </div>
        <div className="row wrap small">{(['low', 'medium', 'high'] as CarbDay[]).map((k) => <span key={k}><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 99, background: COLOR[k], marginRight: 6 }} />{k}</span>)}<span className="mute">Tap a day to see or change it</span></div>
        <p className="small mute">Heavy training days (legs, full body) are planned high carb, rest days low, everything else medium.</p>
      </section>

      {picker !== null && (
        <Sheet title={`Add to ${names[picker]}`} onClose={() => setPicker(null)}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search foods" />
          {!q.trim() && <div className="chips">{[...(data.customFoods.length ? ['My foods'] : []), ...FOOD_CATS].map((c) => <button key={c} className={`chip ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>{c}</button>)}</div>}
          {results.map((f) => (
            <button key={f.id} className="minirow" onClick={() => { addFood(f, picker); setPicker(null) }}>
              <span style={{ flex: 1, textAlign: 'left' }}><b>{f.name}</b><br /><span className="small mute">{f.serving} · {r0(f.cal)} kcal · {f.p}P {f.c}C {f.f}F</span></span><span className="tag accent">Add</span>
            </button>
          ))}
          {results.length === 0 && <p className="small mute">Nothing found. Add it below.</p>}
          <details>
            <summary style={{ fontWeight: 800, cursor: 'pointer' }}>＋ Add my own food</summary>
            <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
              <input value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} placeholder="Food name" />
              <input value={custom.serving} onChange={(e) => setCustom({ ...custom, serving: e.target.value })} placeholder="Serving (e.g. 1 bowl)" />
              <div className="grid2"><input inputMode="decimal" value={custom.cal} onChange={(e) => setCustom({ ...custom, cal: e.target.value })} placeholder="Calories" /><input inputMode="decimal" value={custom.p} onChange={(e) => setCustom({ ...custom, p: e.target.value })} placeholder="Protein g" /></div>
              <div className="grid2"><input inputMode="decimal" value={custom.c} onChange={(e) => setCustom({ ...custom, c: e.target.value })} placeholder="Carbs g" /><input inputMode="decimal" value={custom.f} onChange={(e) => setCustom({ ...custom, f: e.target.value })} placeholder="Fat g" /></div>
              <button className="primary" onClick={saveCustom}>Save and add</button>
            </div>
          </details>
        </Sheet>
      )}

      {gen !== null && (
        <Sheet title={`Build ${names[gen]}`} onClose={() => setGen(null)}>
          <p className="small mute">Pick the foods you’ll eat. The app works out how much of each to hit about <b>{r0(target(gen).p)}P / {r0(target(gen).c)}C / {r0(target(gen).f)}F</b> for this {sel} carb meal. Then adjust and save.</p>
          {chosen.length > 0 && <div className="chips">{chosen.map((f) => <button key={f.id} className="chip on" onClick={() => toggle(f)}>{f.name.split(',')[0]} ✕</button>)}</div>}
          <input value={gq} onChange={(e) => setGq(e.target.value)} placeholder="Search foods" />
          {!gq.trim() && <div className="chips">{[...(data.customFoods.length ? ['My foods'] : []), ...FOOD_CATS].map((c) => <button key={c} className={`chip ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>{c}</button>)}</div>}
          <div style={{ display: 'grid', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
            {genResults.map((f) => (
              <button key={f.id} className="minirow" onClick={() => toggle(f)}>
                <span style={{ flex: 1, textAlign: 'left' }}><b>{f.name}</b><br /><span className="small mute">{f.serving} · {r0(f.cal)} kcal · {f.p}P {f.c}C {f.f}F</span></span><span className={`tag ${chosen.some((x) => x.id === f.id) ? 'accent' : ''}`}>{chosen.some((x) => x.id === f.id) ? '✓' : 'Pick'}</span>
              </button>
            ))}
          </div>
          <button className="primary" disabled={!chosen.length} onClick={() => setBuilt(solveMeal(chosen, target(gen)))}>Work out my portions</button>
          {built && (
            <div style={{ display: 'grid', gap: 8 }}>
              {built.map((x, idx) => (
                <div key={x.item.id} className="row small" style={{ background: 'var(--card2)', borderRadius: 12, padding: '8px 10px' }}>
                  <span style={{ flex: 1 }}><b>{x.item.name}</b><br /><span className="mute">{x.qty} × {x.item.serving}</span></span>
                  <button className="ghost small-btn" onClick={() => adjustBuilt(idx, -0.25)}>−</button>
                  <button className="ghost small-btn" onClick={() => adjustBuilt(idx, 0.25)}>＋</button>
                </div>
              ))}
              {(() => { const t = sumPicks(built); const g = target(gen); return <p className="small">Total: <b>{r0(t.cal)} kcal · {r0(t.p)}P / {r0(t.c)}C / {r0(t.f)}F</b> <span className="mute">(aim {r0(g.p)}/{r0(g.c)}/{r0(g.f)})</span></p> })()}
              <p className="small mute">Not quite right? Use − / ＋, or pick different foods. Estimates only.</p>
              <div className="row wrap">
                <button className="primary" onClick={() => { savePlan(gen, built); logPlan(gen, built); setGen(null) }}>Save and log it</button>
                <button className="ghost" onClick={() => { savePlan(gen, built); setGen(null) }}>Just save</button>
              </div>
            </div>
          )}
        </Sheet>
      )}

      {dayOpen && open && (
        <Sheet title={fromISO(dayOpen).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })} onClose={() => setDayOpen(null)}>
          <p>Planned workout: <b>{open.day === 'Rest/Cardio' ? 'Rest / cardio' : open.day}</b></p>
          <p>Carb day: <b style={{ color: COLOR[open.carb] }}>{open.carb}</b>{open.manual ? ' (you set this)' : ''}</p>
          <p className="small mute">Target on this day: {macroPlan(p, n)[open.carb].cal} kcal · {macroPlan(p, n)[open.carb].p}P / {macroPlan(p, n)[open.carb].c}C / {macroPlan(p, n)[open.carb].f}F</p>
          <div className="chips">{(['low', 'medium', 'high'] as CarbDay[]).map((k) => <button key={k} className={`chip ${open.carb === k ? 'on' : ''}`} onClick={() => update((d) => ({ ...d, carbOverride: { ...d.carbOverride, [dayOpen]: k } }))}>Make it {k}</button>)}</div>
          {open.manual && <button className="ghost" onClick={() => update((d) => { const { [dayOpen]: _x, ...rest } = d.carbOverride; void _x; return { ...d, carbOverride: rest } })}>Back to the plan</button>}
        </Sheet>
      )}
    </>
  )
}
