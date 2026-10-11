import { useState } from 'react'
import { areaName, roundCoord, whereAmI } from './geo'
import PlacePicker from './PlacePicker'
import type { Profile } from './types'

type Area = NonNullable<Profile['area']>

/** "Where do you train?" Encourages sharing a town-level pin (about a mile), never an exact location. Optional and private to you. */
export default function AreaPicker({ area, onChange }: { area: Area | undefined; onChange: (a: Area | undefined) => void }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [typing, setTyping] = useState(false)
  const useMine = async () => {
    setBusy(true); setErr('')
    try {
      const here = await whereAmI()
      const lat = roundCoord(here.lat), lng = roundCoord(here.lng)
      onChange({ name: await areaName(lat, lng), lat, lng })
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); setTyping(true) } finally { setBusy(false) }
  }
  if (area) return <div className="place-picked"><span><b>📍 {area.name}</b><br /><span className="small mute">A town-level pin, about a mile. Only you see it.</span></span><span className="row" style={{ gap: 4 }}><button className="quiet-action" onClick={() => onChange(undefined)}>Remove</button></span></div>
  return (
    <div className="area-picker">
      <p className="small">Share your <b>general area</b> and we’ll show crews and people training near you.</p>
      <button className="primary" onClick={() => void useMine()} disabled={busy}>{busy ? 'Finding your area…' : '📍 Use my area'}</button>
      <p className="small mute">We save a town-level pin (rounded to about a mile), never your exact location or address. Only you can see it. You can remove it any time.</p>
      {err && <p className="small err" role="alert">{err}</p>}
      {typing ? <PlacePicker value={null} onChange={(pl) => { if (pl) onChange({ name: pl.name, lat: pl.lat, lng: pl.lng }) }} /> : <button className="quiet-action" onClick={() => setTyping(true)}>Type a town instead</button>}
    </div>
  )
}
