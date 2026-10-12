import { lazy, Suspense, useEffect, useState } from 'react'
import { lookupBarcode, searchFoodsOnline } from './foodSearch'
import type { FoodItem } from './types'

const BarcodeScanner = lazy(() => import('./BarcodeScanner'))

type Pick = { onPick: (f: FoodItem) => void; isPicked?: (f: FoodItem) => boolean }

const FoodCard = ({ f, onPick, isPicked }: Pick & { f: FoodItem }) => (
  <button type="button" className={`nutrition-food-choice ${isPicked?.(f) ? 'is-selected' : ''}`} onClick={() => onPick(f)}>
    <span><b>{f.name}</b><span>{f.serving} · {f.cal} kcal</span><span>P {f.p} · C {f.c} · F {f.f}</span></span>
  </button>
)
const SOURCES = <p className="nutrition-help">Online results come from USDA FoodData Central and Open Food Facts. Packaged-food entries are community-submitted, so check the label.</p>

/** Barcode scan, shown at the top of the food sheet. */
export function FoodScan({ onPick, isPicked }: Pick) {
  const [scanning, setScanning] = useState(false)
  const [busy, setBusy] = useState(false)
  const [scan, setScan] = useState<{ item: FoodItem | null; failed: boolean; code: string } | null>(null)
  const onCode = async (code: string) => {
    setScanning(false); setBusy(true); setScan(null)
    try { setScan({ item: await lookupBarcode(code), failed: false, code }) } catch { setScan({ item: null, failed: true, code }) }
    setBusy(false)
  }
  return (
    <div className="nutrition-online">
      {scanning
        ? <Suspense fallback={<p className="nutrition-help">Opening camera…</p>}><BarcodeScanner onCode={(c) => void onCode(c)} onClose={() => setScanning(false)} /></Suspense>
        : <button type="button" className="ghost" disabled={busy} onClick={() => { setScan(null); setScanning(true) }}>{busy ? 'Looking up…' : 'Scan a barcode'}</button>}
      {scan?.item && <><div className="nutrition-food-list"><FoodCard f={scan.item} onPick={onPick} isPicked={isPicked} /></div>{SOURCES}</>}
      {scan && !scan.item && <p className="nutrition-help">{scan.failed ? 'Couldn’t reach the food database. Check your connection and try again.' : `No product found for ${scan.code}. Try searching by name, or add your own food.`}</p>}
    </div>
  )
}

/** Search by name, only when tapped: the free databases rate-limit typing-as-you-search. */
export function FoodSearchOnline({ query, onPick, isPicked }: Pick & { query: string }) {
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
      {state && state.items.length > 0 && <><div className="nutrition-food-list">{state.items.map((f) => <FoodCard key={f.id} f={f} onPick={onPick} isPicked={isPicked} />)}</div>{SOURCES}</>}
    </div>
  )
}
