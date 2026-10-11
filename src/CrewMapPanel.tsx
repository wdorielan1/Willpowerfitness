import { lazy, Suspense, useEffect, useState } from 'react'
import { useApp } from './store'
import AreaPicker from './AreaPicker'
import { cloudEnabled, interestNear, reportCrew, saveInterest } from './cloud'
import { distanceMi, roundCoord } from './geo'
import { CAT_LABEL, type CommunityDef } from './data'
import { fmtTime } from './engine'

const CrewMap = lazy(() => import('./CrewMap'))
const NEAR_MI = 25

/** The Map view in Find crews: pins for local crews, a Near me button, and an honest "I'd join one here" wait list. */
export default function CrewMapPanel({ crews, label, onJoin }: { crews: CommunityDef[]; label: (c: CommunityDef) => string; onJoin: (c: CommunityDef) => void }) {
  const { userId, data, update } = useApp()
  const area = data.profile?.area
  const saveArea = (a: { name: string; lat: number; lng: number } | undefined) => update((d) => ({ ...d, profile: d.profile ? { ...d.profile, area: a } : d.profile }))
  const located = crews.filter((c) => typeof c.lat === 'number' && typeof c.lng === 'number') as (CommunityDef & { lat: number; lng: number })[]
  const [sel, setSel] = useState<string | null>(null)
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(area ?? null)
  const [err, setErr] = useState('')
  const [waiting, setWaiting] = useState<number | null>(null)
  const [joined, setJoined] = useState(false)
  const [note, setNote] = useState('')
  const crew = located.find((c) => c.id === sel) ?? null
  const nearby = me ? located.map((c) => ({ c, mi: distanceMi(me, c) })).sort((a, b) => a.mi - b.mi).filter((x) => x.mi <= NEAR_MI).slice(0, 8) : []

  useEffect(() => {
    if (!me || !cloudEnabled) return
    let alive = true
    void interestNear(roundCoord(me.lat), roundCoord(me.lng)).then((n) => { if (alive) setWaiting(n) })
    return () => { alive = false }
  }, [me, joined])

  const wantOne = async () => {
    if (!me || !userId) return
    const e = await saveInterest(userId, roundCoord(me.lat), roundCoord(me.lng), 'Near me')
    if (e) setErr(`Couldn’t save that: ${e}`); else setJoined(true)
  }
  const report = async (c: CommunityDef) => {
    if (!userId) return
    const reason = window.prompt('What’s wrong with this crew? (optional)') ?? null
    if (reason === null) return
    const e = await reportCrew(c.id, userId, reason)
    setNote(e ? `Couldn’t send the report: ${e}` : 'Thanks. The Will Power team will take a look.')
  }

  return (
    <section className="card crew-map-card">
      <div className="row"><h2>Crews near you</h2>{area ? <button className="ghost small-btn" onClick={() => setMe(area)}>Back to {area.name.split(',')[0]}</button> : null}</div>
      {!area && <div className="crew-map-pick"><AreaPicker area={area} onChange={(a) => { saveArea(a); if (a) setMe(a) }} /></div>}
      <p className="small mute">Pins show a crew’s general area, never anyone’s home. {located.length === 0 ? 'No local crews are on the map yet.' : `${located.length} crew${located.length === 1 ? '' : 's'} on the map.`}</p>
      <Suspense fallback={<div className="crew-map crew-map-loading">Loading map…</div>}>
        <CrewMap crews={located} selectedId={sel} onSelect={setSel} focus={me} />
      </Suspense>
      {err && <p className="small err" role="alert">{err}</p>}
      {note && <p className="small ok-text" role="status">{note}</p>}
      {crew && (
        <div className="crew-map-pick">
          <div className="row"><div><h3>{crew.name}</h3><div className="small mute">{crew.place ?? 'Local crew'} · {CAT_LABEL[crew.cat ?? 'time']}</div></div><span className="tag accent">{fmtTime(crew.time)}</span></div>
          <div className="row"><span className="small mute">{label(crew)}</span><span className="row" style={{ gap: 8 }}>{cloudEnabled && <button className="quiet-action" onClick={() => void report(crew)}>Report</button>}<button className="primary small-btn" onClick={() => onJoin(crew)}>Join</button></span></div>
        </div>
      )}
      {me && (
        <div className="crew-map-near">
          <h3>Closest to you</h3>
          {nearby.length === 0 && <p className="small mute">No crews within {NEAR_MI} miles yet.</p>}
          {nearby.map(({ c, mi }) => <button key={c.id} className="minirow" onClick={() => setSel(c.id)}><span style={{ flex: 1, textAlign: 'left' }}><b>{c.name}</b><br /><span className="small mute">{c.place ?? 'Local crew'} · {mi < 1 ? 'under a mile' : `${Math.round(mi)} mi`}</span></span><span className="tag">View</span></button>)}
          {nearby.length === 0 && cloudEnabled && userId && (
            joined
              ? <p className="small ok-text" role="status">You’re on the list. We’ll show how many people near you are looking{waiting ? ` (${waiting} so far)` : ''}.</p>
              : <>{waiting ? <p className="small">{waiting} {waiting === 1 ? 'person' : 'people'} near you {waiting === 1 ? 'is' : 'are'} looking for a crew.</p> : null}<button className="ghost" onClick={() => void wantOne()}>I’d join a crew here</button><p className="small mute">Saves your general area (about a mile) so a local crew can start. Only a count is shown to others.</p></>
          )}
        </div>
      )}
    </section>
  )
}
