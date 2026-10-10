import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../store'
import { Sheet } from '../components'
import { FOODS, FOOD_CATS, MEAL_NAMES, MEAL_SHARE } from '../foods'
import { addDays, carbPlanFor, fromISO, macroPlan, MEALS, projectDays, todayISO } from '../engine'
import { GOALS } from '../data'
import { solveMeal, sumPicks, type Pick } from '../mealgen'
import type { CarbDay, FoodEntry, FoodItem } from '../types'

const CARB_DAYS: CarbDay[] = ['low', 'medium', 'high']
const COLOR: Record<CarbDay, string> = { low: '#82b7f5', medium: '#ecc479', high: 'var(--accent)' }
const r0 = (n: number) => Math.round(n)
const title = (s: string) => s[0].toUpperCase() + s.slice(1)
const month = (ym: string) => fromISO(`${ym}-01`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
const dateLabel = (date: string) => fromISO(date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })
const macroText = (f: { p: number; c: number; f: number }) => `${r0(f.p)}g protein · ${r0(f.c)}g carbs · ${r0(f.f)}g fat`

function Bar({ label, got, goal, unit }: { label: string; got: number; goal: number; unit: string }) {
  const pct = Math.min(100, goal ? (got / goal) * 100 : 0)
  const over = got > goal * 1.05
  return (
    <div className="nutrition-macro">
      <span className="nutrition-macro-label">{label}</span>
      <div className="nutrition-macro-value"><b>{r0(got)}</b><span>/ {goal} {unit}</span></div>
      <div className="bar"><i style={{ width: `${pct}%`, background: over ? '#ef8f83' : undefined }} /></div>
      <span className={`nutrition-macro-remaining ${over ? 'err' : 'mute'}`}>{r0(Math.abs(goal - got))} {unit} {got <= goal ? 'left' : 'over'}</span>
    </div>
  )
}

function PortionControls({ name, qty, onMinus, onPlus }: { name: string; qty: number; onMinus: () => void; onPlus: () => void }) {
  return (
    <div className="nutrition-portion-controls">
      <span className="mute">Servings</span>
      <div className="nutrition-stepper">
        <button type="button" aria-label={`Decrease servings of ${name}`} onClick={onMinus}>−</button>
        <output aria-label={`Servings of ${name}`}>{qty}</output>
        <button type="button" aria-label={`Increase servings of ${name}`} onClick={onPlus}>+</button>
      </div>
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
  const [picker, setPicker] = useState<number | null>(null)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<string>('Protein')
  const [custom, setCustom] = useState({ name: '', serving: '1 serving', cal: '', p: '', c: '', f: '' })
  const [ym, setYm] = useState(today.slice(0, 7))
  const [dayOpen, setDayOpen] = useState<string | null>(null)
  const [gen, setGen] = useState<number | null>(null)
  const [chosen, setChosen] = useState<FoodItem[]>([])
  const [built, setBuilt] = useState<Pick[] | null>(null)
  const [gq, setGq] = useState('')
  const [editingCalendar, setEditingCalendar] = useState(false)
  const [selectionMode, setSelectionMode] = useState<'days' | 'range'>('days')
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [rangeStart, setRangeStart] = useState(today)
  const [rangeEnd, setRangeEnd] = useState(addDays(today, 6))
  const [bulkCarb, setBulkCarb] = useState<CarbDay | 'plan'>('medium')
  const [calendarNotice, setCalendarNotice] = useState('')

  useEffect(() => { setSel(planned.carb) }, [planned.carb])

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
  const categories = [...(data.customFoods.length ? ['My foods'] : []), ...FOOD_CATS]
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

  const first = fromISO(`${ym}-01`)
  const lead = first.getDay()
  const dim = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const maxDate = addDays(today, 90)
  const maxYm = maxDate.slice(0, 7)
  const shiftYm = (k: number) => { const x = new Date(first.getFullYear(), first.getMonth() + k, 1); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}` }
  const open = dayOpen ? carbPlanFor(dayOpen, data, today, proj) : null
  const rangeDays: string[] = []
  if (rangeStart && rangeEnd && rangeStart <= rangeEnd && rangeEnd <= maxDate) {
    for (let date = rangeStart; date <= rangeEnd && rangeDays.length <= 90; date = addDays(date, 1)) rangeDays.push(date)
  }
  const rangeError = !rangeStart || !rangeEnd ? 'Choose a start and end date.' : rangeEnd < rangeStart ? 'End date must be on or after start date.' : rangeEnd > maxDate ? 'Choose dates within the next 90 days.' : rangeDays.length > 90 ? 'Choose a range of up to 90 days.' : ''
  const bulkDates = selectionMode === 'range' ? (rangeError ? [] : rangeDays) : selectedDays
  const applyBulk = () => {
    if (!bulkDates.length) return
    update((d) => {
      const carbOverride = { ...d.carbOverride }
      for (const date of bulkDates) {
        if (bulkCarb === 'plan') delete carbOverride[date]
        else carbOverride[date] = bulkCarb
      }
      return { ...d, carbOverride }
    })
    setCalendarNotice(`${bulkDates.length} day${bulkDates.length === 1 ? '' : 's'} ${bulkCarb === 'plan' ? 'returned to the workout plan' : `set to ${bulkCarb} carb`}.`)
    setSelectedDays([])
    setEditingCalendar(false)
  }
  const toggleDay = (date: string) => {
    setCalendarNotice('')
    if (!editingCalendar) { setDayOpen(date); return }
    if (selectionMode === 'range') {
      setRangeStart(date); setRangeEnd(date)
    } else setSelectedDays((days) => days.includes(date) ? days.filter((day) => day !== date) : [...days, date].sort())
  }

  return (
    <div className="nutrition-page">
      <div className="nutrition-heading"><h1>Nutrition</h1><p className="mute">{GOALS[p.goal]} plan</p></div>

      <div className="nutrition-plan-switch" aria-label="Carb targets">
        {CARB_DAYS.map((k) => <button type="button" key={k} className={sel === k ? 'on' : ''} aria-pressed={sel === k} onClick={() => setSel(k)}>{title(k)} carb</button>)}
      </div>
      <div className="nutrition-plan-note">
        <p>Today’s plan: <b style={{ color: COLOR[planned.carb] }}>{planned.carb} carb</b> <span className="mute">· {planned.manual ? 'set by you' : planned.day === 'Rest/Cardio' ? 'rest day' : `${planned.day} day`}</span></p>
        {sel !== planned.carb && <button type="button" className="ghost" onClick={() => update((d) => ({ ...d, carbOverride: { ...d.carbOverride, [today]: sel } }))}>Use {sel} carb today</button>}
      </div>

      <section className="card nutrition-targets">
        <div className="nutrition-section-heading"><div><span className="overline">{title(sel)} carb targets</span><h2>{r0(m.cal).toLocaleString()} <span>kcal</span></h2></div><Link to="/settings" className="nutrition-text-action">Adjust targets</Link></div>
        <Bar label="Calories" got={tot.cal} goal={m.cal} unit="kcal" />
        <div className="nutrition-macro-grid"><Bar label="Protein" got={tot.p} goal={m.p} unit="g" /><Bar label="Carbs" got={tot.c} goal={m.c} unit="g" /><Bar label="Fat" got={tot.f} goal={m.f} unit="g" /></div>
        <p className="nutrition-help">Estimates based on your profile. Adjust calories, protein and fat in Settings.</p>
      </section>

      <div className="nutrition-meals-heading"><h2>Today’s meals</h2><label className="nutrition-meal-count">Meals per day<select aria-label="Meals per day" value={n.meals} onChange={(e) => setN({ meals: Number(e.target.value) })}>{[2, 3, 4, 5, 6].map((k) => <option key={k} value={k}>{k} meals</option>)}</select></label></div>
      <div className="nutrition-meals">
        {names.map((name, i) => {
          const list = inMeal(i)
          const sum = list.reduce((a, e) => ({ cal: a.cal + e.cal, p: a.p + e.p }), { cal: 0, p: 0 })
          return <section className="card nutrition-meal" key={name + i}>
            <div className="nutrition-meal-heading"><h3>{name}</h3><p className="nutrition-help">Target {r0(m.cal * share[i])} kcal · {r0(m.p * share[i])}g protein</p></div>
            {list.length === 0 && <p className="nutrition-empty">No food logged yet.</p>}
            {list.map((e) => <div key={e.id} className="nutrition-food-entry"><div className="nutrition-food-info"><b>{e.name}</b><span>{e.qty} × {e.serving}</span><span>{r0(e.cal)} kcal · {macroText(e)}</span></div><PortionControls name={e.name} qty={e.qty} onMinus={() => setQty(e, Math.round((e.qty - 0.5) * 2) / 2)} onPlus={() => setQty(e, Math.round((e.qty + 0.5) * 2) / 2)} /></div>)}
            {list.length > 0 && <p className="nutrition-meal-total">Logged: <b>{r0(sum.cal)} kcal · {r0(sum.p)}g protein</b></p>}
            <div className="nutrition-meal-actions"><button type="button" className="primary" onClick={() => { setPicker(i); setQ('') }}>Add food</button><button type="button" className="ghost" onClick={() => openGen(i)}>Build meal</button></div>
            {data.mealPlan[planKey(i)]?.length ? <button type="button" className="ghost nutrition-saved-meal" onClick={() => logPlan(i, data.mealPlan[planKey(i)])}>Log saved meal{list.length > 0 && <span>Replaces this meal’s logged foods</span>}</button> : null}
            <details className="nutrition-meal-ideas"><summary>Meal ideas</summary><p>{MEALS[sel][Math.min(i, MEALS[sel].length - 1)].example}</p></details>
          </section>
        })}
      </div>

      <section className="card nutrition-calendar">
        <div className="nutrition-section-heading"><h2>Carb calendar</h2><button type="button" className="ghost" onClick={() => { setEditingCalendar(!editingCalendar); setCalendarNotice('') }}>{editingCalendar ? 'Done' : 'Edit days'}</button></div>
        <p className="nutrition-help">Follow your workouts, or adjust several days at once.</p>
        {editingCalendar && <div className="nutrition-calendar-editor">
          <div className="nutrition-plan-switch" aria-label="Choose dates"><button type="button" className={selectionMode === 'days' ? 'on' : ''} aria-pressed={selectionMode === 'days'} onClick={() => setSelectionMode('days')}>Pick days</button><button type="button" className={selectionMode === 'range' ? 'on' : ''} aria-pressed={selectionMode === 'range'} onClick={() => setSelectionMode('range')}>Date range</button></div>
          {selectionMode === 'range' ? <div className="nutrition-date-range"><label>From<input type="date" value={rangeStart} max={maxDate} onChange={(e) => setRangeStart(e.target.value)} /></label><label>Through<input type="date" value={rangeEnd} max={maxDate} onChange={(e) => setRangeEnd(e.target.value)} /></label></div> : <p className="nutrition-help">Tap dates below to select them. You can move between months.</p>}
          {selectionMode === 'range' && rangeError && <p className="err" role="alert">{rangeError}</p>}
        </div>}
        <div className="nutrition-month-nav"><button type="button" className="ghost" aria-label="Previous month" onClick={() => setYm(shiftYm(-1))}>‹</button><h3>{month(ym)}</h3><button type="button" className="ghost" aria-label="Next month" onClick={() => setYm(shiftYm(1))} disabled={ym >= maxYm}>›</button></div>
        <div className="nutrition-calendar-grid">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <span key={d} className="nutrition-weekday">{d}</span>)}
          {Array.from({ length: lead }, (_, i) => <span key={`blank-${i}`} />)}
          {Array.from({ length: dim }, (_, i) => {
            const date = `${ym}-${String(i + 1).padStart(2, '0')}`
            const c = carbPlanFor(date, data, today, proj)
            const selected = editingCalendar && bulkDates.includes(date)
            return <button type="button" key={date} className={`nutrition-calendar-day ${date === today ? 'is-today' : ''} ${selected ? 'is-selected' : ''}`} onClick={() => toggleDay(date)} disabled={date > maxDate} aria-pressed={editingCalendar ? selected : undefined} aria-label={`${dateLabel(date)}: ${c.carb} carb${c.manual ? ', set by you' : ''}`} aria-current={date === today ? 'date' : undefined}><span>{i + 1}</span><span className={`nutrition-carb-dot ${c.manual ? 'is-manual' : ''}`} style={{ background: COLOR[c.carb] }} /></button>
          })}
        </div>
        <div className="nutrition-calendar-legend">{CARB_DAYS.map((k) => <span key={k}><i style={{ background: COLOR[k] }} />{title(k)}</span>)}<span><i className="is-manual" />Set by you</span></div>
        {editingCalendar ? <div className="nutrition-bulk-actions">
          <div className="nutrition-bulk-count"><b>{bulkDates.length} day{bulkDates.length === 1 ? '' : 's'} selected</b>{selectionMode === 'days' && selectedDays.length > 0 && <button type="button" className="nutrition-text-action" onClick={() => setSelectedDays([])}>Clear</button>}</div>
          <label>Set selected days to<select value={bulkCarb} onChange={(e) => setBulkCarb(e.target.value as CarbDay | 'plan')}><option value="low">Low carb</option><option value="medium">Medium carb</option><option value="high">High carb</option><option value="plan">Workout plan (reset overrides)</option></select></label>
          <button type="button" className="primary" disabled={!bulkDates.length} onClick={applyBulk}>{bulkCarb === 'plan' ? 'Reset' : 'Apply to'} {bulkDates.length} day{bulkDates.length === 1 ? '' : 's'}</button>
        </div> : <p className="nutrition-help">Tap a date to adjust one day. Legs and full body are high carb; rest days are low.</p>}
        {calendarNotice && <p className="nutrition-calendar-notice" role="status">{calendarNotice}</p>}
      </section>

      {picker !== null && <Sheet title={`Add to ${names[picker]}`} onClose={() => setPicker(null)}>
        <div className="nutrition-sheet-content">
          <label className="nutrition-search">Search foods<input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chicken, rice, yogurt…" /></label>
          {!q.trim() && <div className="nutrition-food-categories" aria-label="Food categories">{categories.map((c) => <button type="button" key={c} className={cat === c ? 'on' : ''} aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>)}</div>}
          <div className="nutrition-food-list">{results.map((f) => <button type="button" key={f.id} className="nutrition-food-choice" onClick={() => { addFood(f, picker); setPicker(null) }}><span><b>{f.name}</b><span>{f.serving} · {r0(f.cal)} kcal</span><span>{macroText(f)}</span></span><span className="nutrition-food-action">Add</span></button>)}</div>
          {results.length === 0 && <p className="nutrition-help">No food matches your search. Add your own below.</p>}
          <details className="nutrition-custom-food"><summary>Add my own food</summary><div className="nutrition-custom-fields">
            <label>Food name<input value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} placeholder="Food name" /></label>
            <label>One serving<input value={custom.serving} onChange={(e) => setCustom({ ...custom, serving: e.target.value })} placeholder="For example, 1 bowl" /></label>
            <div className="nutrition-input-grid"><label>Calories<input inputMode="decimal" value={custom.cal} onChange={(e) => setCustom({ ...custom, cal: e.target.value })} placeholder="kcal" /></label><label>Protein<input inputMode="decimal" value={custom.p} onChange={(e) => setCustom({ ...custom, p: e.target.value })} placeholder="grams" /></label><label>Carbs<input inputMode="decimal" value={custom.c} onChange={(e) => setCustom({ ...custom, c: e.target.value })} placeholder="grams" /></label><label>Fat<input inputMode="decimal" value={custom.f} onChange={(e) => setCustom({ ...custom, f: e.target.value })} placeholder="grams" /></label></div>
            <button type="button" className="primary" disabled={!custom.name.trim()} onClick={saveCustom}>Save food and add</button>
          </div></details>
        </div>
      </Sheet>}

      {gen !== null && <Sheet title={`Build ${names[gen]}`} onClose={() => setGen(null)}>
        <div className="nutrition-sheet-content nutrition-builder">
          <div className="nutrition-builder-heading"><span className="overline">{built === null ? '1. Choose foods' : '2. Adjust portions'}</span><p className="nutrition-help">{title(sel)} carb meal · target {macroText(target(gen))}</p></div>
          {built === null ? <>
            <p className="nutrition-help">Choose the foods you want to eat. Then calculate servings close to this meal’s targets.</p>
            {chosen.length > 0 && <div className="nutrition-chosen-foods" aria-label="Selected foods">{chosen.map((f) => <button type="button" key={f.id} aria-label={`Remove ${f.name} from selected foods`} onClick={() => toggle(f)}><span>{f.name}</span><span aria-hidden="true">×</span></button>)}</div>}
            <button type="button" className="primary nutrition-calculate" disabled={!chosen.length} onClick={() => setBuilt(solveMeal(chosen, target(gen)))}>Calculate portions{chosen.length > 0 ? ` · ${chosen.length} food${chosen.length === 1 ? '' : 's'}` : ''}</button>
            <label className="nutrition-search">Find a food<input value={gq} onChange={(e) => setGq(e.target.value)} placeholder="Chicken, rice, yogurt…" /></label>
            {!gq.trim() && <div className="nutrition-food-categories" aria-label="Food categories">{categories.map((c) => <button type="button" key={c} className={cat === c ? 'on' : ''} aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>)}</div>}
            <div className="nutrition-food-list">{genResults.map((f) => { const selected = chosen.some((x) => x.id === f.id); return <button type="button" key={f.id} className={`nutrition-food-choice ${selected ? 'is-selected' : ''}`} aria-pressed={selected} onClick={() => toggle(f)}><span><b>{f.name}</b><span>{f.serving} · {r0(f.cal)} kcal</span><span>{macroText(f)}</span></span><span className="nutrition-food-action">{selected ? 'Picked' : 'Pick'}</span></button> })}</div>
            {genResults.length === 0 && <p className="nutrition-help">No matching foods. Try a different search or category.</p>}
          </> : <>
            <button type="button" className="ghost" onClick={() => setBuilt(null)}>Change foods</button>
            {built.length === 0 && <p className="nutrition-help">These foods could not produce a portion for the selected targets. Choose another food, or add food directly to your meal.</p>}
            <div className="nutrition-built-portions">{built.map((x, idx) => <div key={x.item.id} className="nutrition-food-entry"><div className="nutrition-food-info"><b>{x.item.name}</b><span>One serving: {x.item.serving}</span><span>{r0(x.item.cal * x.qty)} kcal · {macroText({ p: x.item.p * x.qty, c: x.item.c * x.qty, f: x.item.f * x.qty })}</span></div><PortionControls name={x.item.name} qty={x.qty} onMinus={() => adjustBuilt(idx, -0.25)} onPlus={() => adjustBuilt(idx, 0.25)} /></div>)}</div>
            {(() => { const total = sumPicks(built); return <div className="nutrition-built-total"><span className="overline">Meal total</span><b>{r0(total.cal)} kcal</b><span>{macroText(total)}</span></div> })()}
            <p className="nutrition-help">Adjust in quarter servings. Portions are estimates; a meal may not match every target exactly.</p>
            {inMeal(gen).length > 0 && <p className="nutrition-help">Save and log replaces the foods already logged for {names[gen]}.</p>}
            <div className="nutrition-builder-actions"><button type="button" className="primary" disabled={!built.length} onClick={() => { savePlan(gen, built); logPlan(gen, built); setGen(null) }}>Save and log meal</button><button type="button" className="ghost" disabled={!built.length} onClick={() => { savePlan(gen, built); setGen(null) }}>Save for later</button></div>
          </>}
        </div>
      </Sheet>}

      {dayOpen && open && <Sheet title={dateLabel(dayOpen)} onClose={() => setDayOpen(null)}>
        <div className="nutrition-sheet-content"><p>Workout plan: <b>{open.day === 'Rest/Cardio' ? 'Rest / cardio' : open.day}</b></p><p>Carb target: <b style={{ color: COLOR[open.carb] }}>{title(open.carb)}</b> <span className="mute">{open.manual ? '· set by you' : '· follows your workout'}</span></p><p className="nutrition-help">{plan[open.carb].cal} kcal · {macroText(plan[open.carb])}</p><div className="nutrition-day-actions">{CARB_DAYS.map((k) => <button type="button" key={k} className={open.carb === k ? 'primary' : 'ghost'} aria-pressed={open.carb === k} onClick={() => update((d) => ({ ...d, carbOverride: { ...d.carbOverride, [dayOpen]: k } }))}>{title(k)} carb</button>)}</div>{open.manual && <button type="button" className="ghost" onClick={() => update((d) => { const carbOverride = { ...d.carbOverride }; delete carbOverride[dayOpen]; return { ...d, carbOverride } })}>Return to workout plan</button>}</div>
      </Sheet>}
    </div>
  )
}
