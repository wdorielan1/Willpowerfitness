import { useEffect, useState } from 'react'
import { searchFoodsOnline } from './foodSearch'
import type { FoodItem } from './types'

/** "Search online" for the typed query. Runs only when tapped (the free food databases rate-limit typing-as-you-search). */
export default function OnlineFoods({ query, onPick, isPicked }: { query: string; onPick: (f: FoodItem) => void; isPicked?: (f: FoodItem) => boolean }) {
  const [state, setState] = useState<{ q: string; items: FoodItem[]; failed: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const q = query.trim()
  useEffect(() => { setState(null) }, [q])
  if (q.length < 2) return null
  const run = async () => { setBusy(true); const r = await searchFoodsOnline(q); setState({ q, ...r }); setBusy(false) }
  return (
    <div className="nutrition-online">
      <button type="button" className="ghost" disabled={busy} onClick={() => void run()}>{busy ? 'Searching…' : `Search online for “${q}”`}</button>
      {state && state.failed && <p className="nutrition-help">Couldn’t reach the food databases. Check your connection and try again, or add your own food.</p>}
      {state && !state.failed && state.items.length === 0 && <p className="nutrition-help">Nothing found online. Try a simpler name, or add your own food.</p>}
      {state && state.items.length > 0 && <>
        <div className="nutrition-food-list">{state.items.map((f) => (
          <button type="button" key={f.id} className={`nutrition-food-choice ${isPicked?.(f) ? 'is-selected' : ''}`} onClick={() => onPick(f)}>
            <span><b>{f.name}</b><span>{f.serving} · {f.cal} kcal</span><span>P {f.p} · C {f.c} · F {f.f}</span></span>
          </button>
        ))}</div>
        <p className="nutrition-help">Online results come from USDA FoodData Central and Open Food Facts. Packaged-food entries are community-submitted, so check the label.</p>
      </>}
    </div>
  )
}
