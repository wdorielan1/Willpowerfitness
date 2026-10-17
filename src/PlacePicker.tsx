import { useState } from 'react'
import { searchPlaces, type Place } from './geo'

/** Optional "where does this crew meet?" search. Saves only a town or neighbourhood, rounded to about a mile. */
export default function PlacePicker({ value, onChange }: { value: Place | null; onChange: (p: Place | null) => void }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Place[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const search = async () => {
    if (q.trim().length < 2) return
    setBusy(true); setErr('')
    try { setResults(await searchPlaces(q)) } catch (e) { setErr(e instanceof Error ? e.message : String(e)); setResults(null) } finally { setBusy(false) }
  }
  if (value) return <div className="place-picked"><span><b>{value.name}</b><br /><span className="small mute">Shown on the map as a general area, not an address.</span></span><button className="quiet-action" onClick={() => { onChange(null); setResults(null) }}>Change</button></div>
  return (
    <div className="place-picker">
      <div className="train-build-save"><input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void search() } }} placeholder="Town or neighbourhood (optional)" aria-label="Search for a place" /><button type="button" className="ghost" disabled={busy || q.trim().length < 2} onClick={() => void search()}>{busy ? '…' : 'Search'}</button></div>
      {err && <p className="small err" role="alert">{err}</p>}
      {results && results.length === 0 && <p className="small mute">No places found. Try a nearby town.</p>}
      {results?.map((r) => <button type="button" key={`${r.lat},${r.lng}`} className="minirow" onClick={() => onChange(r)}><span style={{ flex: 1, textAlign: 'left' }}><b>{r.name}</b></span><span className="tag accent">Use</span></button>)}
    </div>
  )
}
