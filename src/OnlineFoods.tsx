import { lazy, Suspense, useEffect, useState } from 'react'
import { lookupBarcode, searchFoodsOnline } from './foodSearch'
import type { FoodItem } from './types'

const BarcodeScanner = lazy(() => import('./BarcodeScanner'))

/** Online food lookup: search by name (only when tapped, since the free databases rate-limit typing-as-you-search) or scan a barcode. */
export default function OnlineFoods({ query, onPick, isPicked }: { query: string; onPick: (f: FoodItem) => void; isPicked?: (f: FoodItem) => boolean }) {
  const [state, setState] = useState<{ q: string; items: FoodItem[]; failed: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scan, setScan] = useState<{ item: FoodItem | null; failed: boolean; code: string } | null>(null)
  const q = query.trim()
  useEffect(() => { setState(null) }, [q])
  const run = async () => { setBusy(true); const r = await searchFoodsOnline(q); setState({ q, ...r }); setBusy(false) }
  const onCode = async (code: string) => {
    setScanning(false); setBusy(true); setScan(null)
    try { setScan({ item: await lookupBarcode(code), failed: false, code }) } catch { setScan({ item: null, failed: true, code }) }
    setBusy(false)
  }
  const card = (f: FoodItem) => (
    <button type="button" key={f.id} className={`nutrition-food-choice ${isPicked?.(f) ? 'is-selected' : ''}`} onClick={() => onPick(f)}>
      <span><b>{f.name}</b><span>{f.serving} · {f.cal} kcal</span><span>P {f.p} · C {f.c} · F {f.f}</span></span>
    </button>
  )
  return (
    <div className="nutrition-online">
      {scanning
        ? <Suspense fallback={<p className="nutrition-help">Opening camera…</p>}><BarcodeScanner onCode={(c) => void onCode(c)} onClose={() => setScanning(false)} /></Suspense>
        : <button type="button" className="ghost" disabled={busy} onClick={() => { setScan(null); setScanning(true) }}>Scan a barcode</button>}
      {scan?.item && <div className="nutrition-food-list">{card(scan.item)}</div>}
      {scan && !scan.item && <p className="nutrition-help">{scan.failed ? 'Couldn’t reach the food database. Check your connection and try again.' : `No product found for ${scan.code}. Try searching by name, or add your own food.`}</p>}
      {q.length >= 2 && !scanning && <button type="button" className="ghost" disabled={busy} onClick={() => void run()}>{busy ? 'Searching…' : `Search online for “${q}”`}</button>}
      {state && state.failed && <p className="nutrition-help">Couldn’t reach the food databases. Check your connection and try again, or add your own food.</p>}
      {state && !state.failed && state.items.length === 0 && <p className="nutrition-help">Nothing found online. Try a simpler name, or add your own food.</p>}
      {state && state.items.length > 0 && <div className="nutrition-food-list">{state.items.map(card)}</div>}
      {(scan?.item || (state && state.items.length > 0)) && <p className="nutrition-help">Online results come from USDA FoodData Central and Open Food Facts. Packaged-food entries are community-submitted, so check the label.</p>}
    </div>
  )
}
