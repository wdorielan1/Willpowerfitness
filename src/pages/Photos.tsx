import { useEffect, useRef, useState } from 'react'
import { useApp } from '../store'
import { Lightbox } from '../components'
import { cloudEnabled } from '../cloud'
import { compress, deletePhotoBlob, savePhotoBlob, usePhotoUrls } from '../photos'
import { fromISO, todayISO } from '../engine'
import type { Photo, Pose } from '../types'

const POSES: { id: Pose; label: string; tip: string }[] = [
  { id: 'front', label: 'Front', tip: 'Face the camera, feet shoulder-width, both arms raised overhead.' },
  { id: 'side', label: 'Side', tip: 'Turn 90°, stand tall, arms raised overhead. Same side every time.' },
  { id: 'back', label: 'Back', tip: 'Face away from the camera, feet shoulder-width, arms raised overhead.' },
  { id: 'other', label: 'Other', tip: 'Any extra angle, like a flex or relaxed pose.' },
]
const label = (p: Pose) => POSES.find((x) => x.id === p)!.label

/** Outline you line your body up with. Arms are raised, as in the pose guide. */
export function Silhouette({ pose, style }: { pose: Pose; style?: React.CSSProperties }) {
  const s = { stroke: 'rgba(255,255,255,.75)', strokeWidth: 9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none', strokeDasharray: '1 14' }
  return (
    <svg viewBox="0 0 200 400" style={style} aria-hidden>
      {pose === 'side' ? (
        <>
          <circle cx="102" cy="42" r="21" {...s} />
          <path d="M100 66V84M90 92Q86 150 90 230M112 92Q120 150 108 230" {...s} />
          <path d="M98 94L104 14" {...s} />
          <path d="M92 230L90 380M106 230L112 380" {...s} />
        </>
      ) : (
        <>
          <circle cx="100" cy="42" r="21" {...s} />
          <path d="M100 66V84M62 92H138M62 92Q70 160 80 230M138 92Q130 160 120 230M80 230H120" {...s} />
          <path d="M62 92L40 14M138 92L160 14" {...s} />
          <path d="M86 230L78 380M114 230L122 380" {...s} />
          {pose === 'back' && <path d="M100 90V225" {...s} />}
        </>
      )}
    </svg>
  )
}

function Camera({ pose, onShot, onClose }: { pose: Pose; onShot: (b: Blob) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const [facing, setFacing] = useState<'user' | 'environment'>('user')
  const [timer, setTimer] = useState(10)
  const [count, setCount] = useState<number | null>(null)
  const [err, setErr] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let off = false
    setReady(false)
    stream.current?.getTracks().forEach((t) => t.stop())
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 1920 } }, audio: false })
      .then((s) => {
        if (off) { s.getTracks().forEach((t) => t.stop()); return }
        stream.current = s
        if (video.current) { video.current.srcObject = s; void video.current.play() }
      })
      .catch(() => setErr('Camera is not available. Allow camera access in your browser, or choose a photo from your library instead.'))
    return () => { off = true; stream.current?.getTracks().forEach((t) => t.stop()) }
  }, [facing])

  const snap = () => {
    const v = video.current
    if (!v || !v.videoWidth) return
    const c = document.createElement('canvas')
    c.width = v.videoWidth; c.height = v.videoHeight
    c.getContext('2d')!.drawImage(v, 0, 0)
    c.toBlob((b) => b && onShot(b), 'image/jpeg', 0.9)
  }
  const go = () => {
    if (!timer) return snap()
    let n = timer
    setCount(n)
    const id = setInterval(() => {
      n -= 1
      if (n <= 0) { clearInterval(id); setCount(null); snap() } else setCount(n)
    }, 1000)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 50, display: 'grid', gridTemplateRows: '1fr auto' }}>
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <video ref={video} playsInline muted onLoadedData={() => setReady(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: facing === 'user' ? 'scaleX(-1)' : 'none' }} />
        <Silhouette pose={pose} style={{ position: 'absolute', inset: '4% 0', margin: 'auto', height: '92%', opacity: 0.9 }} />
        {count !== null && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 120, fontWeight: 900, textShadow: '0 4px 20px #000' }}>{count}</div>}
        {err && <div className="banner" style={{ position: 'absolute', top: 70, left: 16, right: 16 }}>{err}</div>}
        <div className="tag" style={{ position: 'absolute', top: 'calc(14px + env(safe-area-inset-top))', left: 14 }}>{label(pose)} · line up with the outline</div>
      </div>
      <div style={{ padding: '14px 16px calc(14px + env(safe-area-inset-bottom))', display: 'grid', gap: 10, background: '#0b0b0d' }}>
        <div className="chips" style={{ justifyContent: 'center' }}>
          {[0, 5, 10].map((t) => <button key={t} className={`chip ${timer === t ? 'on' : ''}`} onClick={() => setTimer(t)}>{t ? `${t}s timer` : 'No timer'}</button>)}
        </div>
        <div className="grid3">
          <button className="ghost" onClick={onClose}>Close</button>
          <button className="primary" onClick={go} disabled={count !== null || !!err || !ready}>{count !== null ? '…' : !ready && !err ? 'Starting…' : timer ? 'Start timer' : 'Take photo'}</button>
          <button className="ghost" onClick={() => setFacing(facing === 'user' ? 'environment' : 'user')}>Flip</button>
        </div>
      </div>
    </div>
  )
}

export default function Photos() {
  const { data, update, userId } = useApp()
  const [tab, setTab] = useState<'add' | 'compare' | 'all'>('add')
  const [pose, setPose] = useState<Pose>('front')
  const [cam, setCam] = useState(false)
  const [date, setDate] = useState(todayISO())
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [view, setView] = useState<{ srcs: string[]; start: number; caption: string[] } | null>(null)
  const urls = usePhotoUrls(data.photos)
  const file = useRef<HTMLInputElement>(null)

  const store = async (blob: Blob, when: string) => {
    setBusy(true)
    try {
      const small = await compress(blob)
      const id = `${Date.now()}-${pose}`
      const r = await savePhotoBlob(id, small, userId)
      const photo: Photo = { id, date: when, pose, path: r.path }
      update((d) => ({ ...d, photos: [...d.photos, photo] }))
      setMsg(r.where === 'cloud' ? 'Saved to your private account.' : cloudEnabled ? 'Saved on this device only: cloud photo storage is not set up yet.' : 'Saved on this device.')
    } catch { setMsg('Could not save that photo. Try again.') }
    setBusy(false)
  }

  const remove = async (p: Photo) => {
    if (!confirm('Delete this photo?')) return
    await deletePhotoBlob(p)
    update((d) => ({ ...d, photos: d.photos.filter((x) => x.id !== p.id) }))
  }

  const ofPose = data.photos.filter((p) => p.pose === pose).sort((a, b) => a.date.localeCompare(b.date))
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const pa = ofPose.find((p) => p.id === a) ?? ofPose[0]
  const pb = ofPose.find((p) => p.id === b) ?? ofPose[ofPose.length - 1]
  const days = pa && pb ? Math.round((fromISO(pb.date).getTime() - fromISO(pa.date).getTime()) / 86400000) : 0
  const wAt = (d: string) => [...data.weights].filter((w) => w.date <= d).sort((x, y) => y.date.localeCompare(x.date))[0]?.lbs
  const opt = (p: Photo) => <option key={p.id} value={p.id}>{p.date}</option>

  return (
    <>
      <div><h1>Progress photos</h1><p className="mute">Same pose, same lighting, every time. Only you can see these.</p></div>
      <div className="tabs">
        {(['add', 'compare', 'all'] as const).map((t) => <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{{ add: 'Add', compare: 'Compare', all: 'All' }[t]}</button>)}
      </div>

      <div className="chips">
        {POSES.map((p) => <button key={p.id} className={`chip ${pose === p.id ? 'on' : ''}`} onClick={() => setPose(p.id)}>{p.label}</button>)}
      </div>

      {tab === 'add' && (
        <section className="card">
          <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 14, alignItems: 'center' }}>
            <div style={{ background: '#000', borderRadius: 14, padding: 8 }}><Silhouette pose={pose} style={{ width: '100%', height: 150 }} /></div>
            <div><h3>{label(pose)} pose</h3><p className="small mute">{POSES.find((x) => x.id === pose)!.tip}</p></div>
          </div>
          <button className="primary" onClick={() => setCam(true)} disabled={busy}>📷 Open camera with guide</button>
          <label>Or choose from your photos (any date)
            <input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
          </label>
          <input ref={file} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void store(f, date); e.target.value = '' }} />
          <button className="ghost" onClick={() => file.current?.click()} disabled={busy}>Choose photo</button>
          {busy && <p className="small mute">Saving…</p>}
          {msg && <p className="small ok-text">{msg}</p>}
        </section>
      )}

      {tab === 'compare' && (
        ofPose.length < 2 ? (
          <section className="card"><p className="mute">Add at least two {label(pose).toLowerCase()} photos on different dates to compare them side by side.</p></section>
        ) : (
          <section className="card">
            <div className="grid2">
              <label>Before<select value={pa?.id} onChange={(e) => setA(e.target.value)}>{ofPose.map(opt)}</select></label>
              <label>After<select value={pb?.id} onChange={(e) => setB(e.target.value)}>{ofPose.map(opt)}</select></label>
            </div>
            <div className="grid2">
              {[pa, pb].map((p, i) => p && (
                <div key={i} style={{ display: 'grid', gap: 6 }}>
                  {urls[p.id] ? <img src={urls[p.id]} alt={`${label(pose)} ${p.date}`} onClick={() => { const both = [pa, pb].filter((x): x is Photo => !!x && !!urls[x.id]); setView({ srcs: both.map((x) => urls[x.id]), start: Math.max(0, both.findIndex((x) => x.id === p.id)), caption: both.map((x) => `${label(pose)} · ${x.date}`) }) }} style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', borderRadius: 12, cursor: 'zoom-in' }} /> : <div className="stat" style={{ aspectRatio: '3/4' }} />}
                  <div className="small"><b>{p.date}</b>{wAt(p.date) ? <span className="mute"> · {wAt(p.date)} lb</span> : null}</div>
                </div>
              ))}
            </div>
            <p className="small mute">{days} days apart{pa && pb && wAt(pa.date) && wAt(pb.date) ? ` · ${Math.round((wAt(pb.date)! - wAt(pa.date)!) * 10) / 10} lb change` : ''}</p>
          </section>
        )
      )}

      {tab === 'all' && (
        data.photos.length === 0 ? <section className="card"><p className="mute">No photos yet. Take your first set today. Future you will thank you.</p></section> : (
          <div className="grid3">
            {[...data.photos].sort((x, y) => y.date.localeCompare(x.date)).map((p) => (
              <div key={p.id} style={{ display: 'grid', gap: 4 }}>
                {urls[p.id] ? <img src={urls[p.id]} alt="" onClick={() => { const list = [...data.photos].sort((x, y) => y.date.localeCompare(x.date)).filter((x) => urls[x.id]); setView({ srcs: list.map((x) => urls[x.id]), start: list.findIndex((x) => x.id === p.id), caption: list.map((x) => `${label(x.pose)} · ${x.date}`) }) }} style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', borderRadius: 10, cursor: 'zoom-in' }} /> : <div className="stat" style={{ aspectRatio: '3/4' }} />}
                <div className="small mute">{p.date.slice(5)} · {label(p.pose)}</div>
                <button className="ghost small-btn" onClick={() => void remove(p)}>Delete</button>
              </div>
            ))}
          </div>
        )
      )}

      {view && <Lightbox srcs={view.srcs} start={view.start} caption={view.caption} onClose={() => setView(null)} />}
      {cam && <Camera pose={pose} onClose={() => setCam(false)} onShot={(blob) => { setCam(false); void store(blob, todayISO()) }} />}
    </>
  )
}
