import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../store'
import { Icon } from '../icons'
import { ConfirmSheet, Lightbox } from '../components'
import { cloudEnabled } from '../cloud'
import { compress, deletePhotoBlob, savePhotoBlob, usePhotoUrls, withTimeout } from '../photos'
import { fromISO, todayISO } from '../engine'
import type { Photo, Pose } from '../types'

const POSES: { id: Pose; label: string; tip: string }[] = [
  { id: 'front', label: 'Front', tip: 'Face the camera, feet shoulder-width, both arms raised overhead.' },
  { id: 'side', label: 'Side', tip: 'Turn 90°, stand tall, arms raised overhead. Same side every time.' },
  { id: 'back', label: 'Back', tip: 'Face away from the camera, feet shoulder-width, arms raised overhead.' },
  { id: 'other', label: 'Other', tip: 'Any extra angle, like a flex or relaxed pose.' },
]
const label = (p: Pose) => POSES.find((x) => x.id === p)!.label
const photoDate = (date: string) => fromISO(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

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
  const dialog = useRef<HTMLDivElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const countdown = useRef<number | null>(null)
  const active = useRef(false)
  const close = useRef(onClose)
  close.current = onClose
  const [facing, setFacing] = useState<'user' | 'environment'>('user')
  const [timer, setTimer] = useState(10)
  const [count, setCount] = useState<number | null>(null)
  const [err, setErr] = useState('')
  const [ready, setReady] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [guide, setGuide] = useState(pose !== 'other')

  useEffect(() => {
    active.current = true
    const previousFocus = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButton.current?.focus()
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close.current() }
      if (event.key !== 'Tab') return
      const buttons = Array.from(dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])
      const first = buttons[0], last = buttons[buttons.length - 1]
      if (event.shiftKey && (document.activeElement === first || !dialog.current?.contains(document.activeElement))) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && (document.activeElement === last || !dialog.current?.contains(document.activeElement))) { event.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', key)
    return () => {
      active.current = false
      if (countdown.current !== null) window.clearInterval(countdown.current)
      document.removeEventListener('keydown', key)
      document.body.style.overflow = overflow
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
    }
  }, [])

  useEffect(() => {
    let off = false
    setReady(false); setErr('')
    stream.current?.getTracks().forEach((track) => track.stop())
    stream.current = null
    if (video.current) video.current.srcObject = null
    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera unavailable')
        const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 1920 } }, audio: false })
        if (off) { media.getTracks().forEach((track) => track.stop()); return }
        stream.current = media
        if (video.current) { video.current.srcObject = media; await video.current.play() }
      } catch {
        if (!off) { setReady(false); setErr('Camera is not available. Allow camera access in your browser, or choose a photo from your library.') }
      }
    }
    void start()
    return () => { off = true; stream.current?.getTracks().forEach((track) => track.stop()) }
  }, [facing])

  const snap = async () => {
    const frame = video.current
    if (!frame?.videoWidth || capturing || !active.current) return
    setCapturing(true); setErr('')
    const canvas = document.createElement('canvas')
    const scale = Math.min(1, 1280 / Math.max(frame.videoWidth, frame.videoHeight))
    canvas.width = Math.max(1, Math.round(frame.videoWidth * scale))
    canvas.height = Math.max(1, Math.round(frame.videoHeight * scale))
    try {
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Could not take the photo. Try choosing one from your library.')
      context.drawImage(frame, 0, 0, canvas.width, canvas.height)
      const blob = await withTimeout(new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => b ? resolve(b) : reject(new Error('Could not take the photo. Please try again.')), 'image/jpeg', 0.9)), 15000, 'Taking photo')
      if (active.current) onShot(blob)
    } catch (error) {
      if (active.current) setErr(error instanceof Error ? error.message : 'Could not take the photo. Please try again.')
    } finally {
      canvas.width = canvas.height = 0
      if (active.current) setCapturing(false)
    }
  }
  const capture = () => {
    if (count !== null) {
      if (countdown.current !== null) window.clearInterval(countdown.current)
      countdown.current = null; setCount(null)
      return
    }
    if (!timer) { void snap(); return }
    let remaining = timer
    setCount(remaining)
    countdown.current = window.setInterval(() => {
      remaining -= 1
      if (remaining <= 0) {
        if (countdown.current !== null) window.clearInterval(countdown.current)
        countdown.current = null; setCount(null); void snap()
      } else setCount(remaining)
    }, 1000)
  }

  return (
    <div ref={dialog} className="photo-camera" role="dialog" aria-modal="true" aria-label={`${label(pose)} photo camera`}>
      <div className="photo-camera-view">
        <video ref={video} playsInline muted onLoadedData={() => setReady(true)} className={facing === 'user' ? 'is-mirrored' : ''} />
        {guide && <Silhouette pose={pose} style={{ position: 'absolute', inset: '8% 0', margin: 'auto', height: '84%', opacity: 0.85 }} />}
        <header className="photo-camera-header">
          <button ref={closeButton} className="photo-camera-icon" aria-label="Close camera" onClick={onClose}><Icon name="close" size={20} /></button>
          <span>{label(pose)} photo</span>
          <button className="photo-camera-icon" aria-label="Flip camera" disabled={count !== null || capturing} onClick={() => setFacing((current) => current === 'user' ? 'environment' : 'user')}><Icon name="flip" size={21} /></button>
        </header>
        {count !== null && <output className="photo-camera-count" aria-live="polite" aria-label="Countdown">{count}</output>}
        {err && <p className="photo-camera-error" role="alert">{err}</p>}
      </div>
      <div className="photo-camera-controls">
        <div className="photo-camera-tools">
          <div className="photo-camera-timers" role="group" aria-label="Camera timer">
            {[0, 5, 10].map((seconds) => <button key={seconds} aria-pressed={timer === seconds} disabled={count !== null || capturing} onClick={() => setTimer(seconds)}>{seconds ? `${seconds}s` : 'Off'}</button>)}
          </div>
          <button className="quiet-action" aria-pressed={guide} onClick={() => setGuide((current) => !current)}>{guide ? 'Hide guide' : 'Show guide'}</button>
        </div>
        <button className="primary photo-camera-capture" onClick={capture} disabled={capturing || (count === null && !ready)}>
          <Icon name={count !== null ? 'close' : 'camera'} size={20} />
          {capturing ? 'Taking photo…' : count !== null ? 'Cancel timer' : !ready && !err ? 'Starting camera…' : timer ? `Start ${timer}s timer` : 'Take photo'}
        </button>
      </div>
    </div>
  )
}

export default function Photos() {
  const { data, update, userId } = useApp()
  const [tab, setTab] = useState<'add' | 'compare' | 'all'>(() => data.photos.length ? 'all' : 'add')
  const [pose, setPose] = useState<Pose>('front')
  const [cam, setCam] = useState(false)
  const [date, setDate] = useState(todayISO())
  const [feedback, setFeedback] = useState<{ text: string; error: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  const [deleting, setDeleting] = useState<Photo | null>(null)
  const [removing, setRemoving] = useState(false)
  const deletionPending = useRef(false)
  const [view, setView] = useState<{ srcs: string[]; start: number; caption: string[] } | null>(null)
  const urls = usePhotoUrls(data.photos)
  const file = useRef<HTMLInputElement>(null)
  const validDate = !!date && date <= todayISO()

  const store = async (blob: Blob, when: string, selectedPose: Pose) => {
    if (pending.current) return
    if (!when || when > todayISO()) { setFeedback({ text: 'Choose today or an earlier photo date.', error: true }); return }
    pending.current = true; setBusy(true); setFeedback(null)
    try {
      const small = await compress(blob)
      const id = `${Date.now()}-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}-${selectedPose}`
      const result = await savePhotoBlob(id, small, userId)
      const photo: Photo = { id, date: when, pose: selectedPose, path: result.path }
      update((current) => ({ ...current, photos: [...current.photos, photo] }))
      setFeedback({ text: result.where === 'cloud' ? 'Saved to your private account.' : result.error ? `Saved on this device. Cloud upload failed: ${result.error}` : 'Saved on this device.', error: false })
      setTab('all')
    } catch (error) {
      setFeedback({ text: error instanceof Error ? error.message : 'Could not save that photo. Please try again.', error: true })
    } finally {
      pending.current = false; setBusy(false)
    }
  }
  const remove = async (photo: Photo) => {
    if (deletionPending.current) return
    deletionPending.current = true; setRemoving(true); setFeedback(null)
    try {
      await deletePhotoBlob(photo)
      update((current) => ({ ...current, photos: current.photos.filter((item) => item.id !== photo.id) }))
      setDeleting(null); setA(''); setB('')
      setFeedback({ text: 'Photo deleted.', error: false })
    } catch (error) {
      setFeedback({ text: error instanceof Error ? error.message : 'Could not delete that photo. Please try again.', error: true })
      setDeleting(null)
    } finally {
      deletionPending.current = false; setRemoving(false)
    }
  }

  const ofPose = data.photos.filter((photo) => photo.pose === pose).sort((left, right) => left.date.localeCompare(right.date))
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const pa = ofPose.find((photo) => photo.id === a) ?? ofPose[0]
  const selectedAfter = ofPose.find((photo) => photo.id === b) ?? ofPose[ofPose.length - 1]
  const pb = selectedAfter?.id === pa?.id ? [...ofPose].reverse().find((photo) => photo.id !== pa?.id) ?? selectedAfter : selectedAfter
  const days = pa && pb ? Math.abs(Math.round((fromISO(pb.date).getTime() - fromISO(pa.date).getTime()) / 86400000)) : 0
  const wAt = (when: string) => [...data.weights].filter((weight) => weight.date <= when).sort((left, right) => right.date.localeCompare(left.date))[0]?.lbs
  const library = [...data.photos].sort((left, right) => right.date.localeCompare(left.date))
  const openPhoto = (photo: Photo, list: Photo[]) => {
    const available = list.filter((item) => urls[item.id])
    const index = available.findIndex((item) => item.id === photo.id)
    if (index >= 0) setView({ srcs: available.map((item) => urls[item.id]), start: index, caption: available.map((item) => `${label(item.pose)} · ${photoDate(item.date)}`) })
  }
  const image = (photo: Photo, list: Photo[]) => urls[photo.id]
    ? <button className="progress-photo-image" aria-label={`Open ${label(photo.pose).toLowerCase()} photo from ${photo.date}`} onClick={() => openPhoto(photo, list)}><img src={urls[photo.id]} alt={`${label(photo.pose)} pose, ${photoDate(photo.date)}`} /></button>
    : <div className="progress-photo-placeholder" role="img" aria-label={`${label(photo.pose)} photo preview, ${photoDate(photo.date)}`}><Icon name="photo" size={24} /></div>

  return (
    <div className="progress-photos-page">
      <header className="progress-photos-heading">
        <Link to="/progress" className="quiet-action"><Icon name="back" size={16} />Progress</Link>
        <h1>Progress photos</h1>
        <p>Compare the same pose over time.</p>
      </header>
      <div className="progress-photos-tabs" role="group" aria-label="Photo views">
        {(['add', 'compare', 'all'] as const).map((value) => <button key={value} aria-pressed={tab === value} disabled={busy || removing} onClick={() => setTab(value)}>{{ add: 'Add', compare: 'Compare', all: 'Library' }[value]}</button>)}
      </div>
      {tab !== 'all' && <div className="progress-photos-poses" role="group" aria-label="Photo pose">
        {POSES.map((item) => <button key={item.id} aria-pressed={pose === item.id} disabled={busy} onClick={() => setPose(item.id)}>{item.label}</button>)}
      </div>}
      {busy && <p className="progress-photos-feedback" role="status">Saving photo…</p>}
      {feedback && <p className={`progress-photos-feedback${feedback.error ? ' err' : ''}`} role={feedback.error ? 'alert' : 'status'}>{feedback.text}</p>}

      {tab === 'add' && <section className="progress-photos-add" aria-labelledby="photo-add-title">
        <div className="progress-photos-add-heading"><Icon name="photo" size={26} /><h2 id="photo-add-title">Add a {label(pose).toLowerCase()} photo</h2><p>Use similar lighting and camera distance each time.</p></div>
        <label className="progress-photos-date">Date for selected photo<input type="date" value={date} max={todayISO()} disabled={busy} onChange={(event) => setDate(event.target.value)} /></label>
        <input ref={file} type="file" accept="image/*" hidden onChange={(event) => { const selected = event.target.files?.[0]; if (selected) void store(selected, date, pose); event.target.value = '' }} />
        <div className="progress-photos-add-actions">
          <button className="primary" onClick={() => file.current?.click()} disabled={busy || !validDate}><Icon name="upload" size={18} />Choose photo</button>
          <button className="ghost" onClick={() => setCam(true)} disabled={busy}><Icon name="camera" size={19} />Take photo today</button>
        </div>
        <details className="progress-photos-guide">
          <summary>Pose guide<Icon name="chevron" size={16} /></summary>
          <div>{pose !== 'other' && <Silhouette pose={pose} style={{ width: 70, height: 140, flex: 'none' }} />}<p>{POSES.find((item) => item.id === pose)!.tip}</p></div>
        </details>
      </section>}

      {tab === 'compare' && (ofPose.length < 2
        ? <section className="progress-photos-empty"><Icon name="photo" size={30} /><h2>{ofPose.length ? 'Add one more photo' : 'Choose two photos'}</h2><p>{ofPose.length ? 'Add another' : 'Add two'} {label(pose).toLowerCase()} {ofPose.length ? 'photo' : 'photos'} to compare side by side.</p><button className="ghost" onClick={() => setTab('add')}><Icon name="plus" size={18} />Add photo</button></section>
        : <section className="progress-photos-comparison" aria-label={`${label(pose)} photo comparison`}>
          <div className="progress-photos-selectors">
            <label>Before<select aria-label="Before photo" value={pa?.id} onChange={(event) => setA(event.target.value)}>{ofPose.map((photo, index) => <option key={photo.id} value={photo.id} disabled={photo.id === pb?.id || (!!pb && photo.date > pb.date)}>{photoDate(photo.date)}{ofPose.filter((item) => item.date === photo.date).length > 1 ? ` (${index + 1})` : ''}</option>)}</select></label>
            <label>After<select aria-label="After photo" value={pb?.id} onChange={(event) => setB(event.target.value)}>{ofPose.map((photo, index) => <option key={photo.id} value={photo.id} disabled={photo.id === pa?.id || (!!pa && photo.date < pa.date)}>{photoDate(photo.date)}{ofPose.filter((item) => item.date === photo.date).length > 1 ? ` (${index + 1})` : ''}</option>)}</select></label>
          </div>
          <div className="progress-photos-pair">{[pa, pb].map((photo, index) => photo && <div key={index}>{image(photo, [pa, pb].filter((item): item is Photo => !!item))}<div className="progress-photos-caption"><time dateTime={photo.date}>{photoDate(photo.date)}</time>{wAt(photo.date) !== undefined && <span>{wAt(photo.date)} lb</span>}</div></div>)}</div>
          <p className="progress-photos-comparison-note">{days ? `${days} days apart` : 'Same date'}{pa && pb && wAt(pa.date) !== undefined && wAt(pb.date) !== undefined ? ` · ${Math.round((wAt(pb.date)! - wAt(pa.date)!) * 10) / 10} lb change` : ''}</p>
        </section>)}

      {tab === 'all' && <>
        <div className="progress-photos-library-heading"><h2>Library</h2><span>{data.photos.length} {data.photos.length === 1 ? 'photo' : 'photos'}</span><button className="quiet-action" onClick={() => setTab('add')} disabled={busy || removing}><Icon name="plus" size={16} />Add</button></div>
        {library.length === 0 ? <section className="progress-photos-empty"><Icon name="photo" size={30} /><h2>No photos yet</h2><p>Add a photo to start your collection.</p><button className="ghost" onClick={() => setTab('add')}><Icon name="plus" size={18} />Add photo</button></section>
          : <div className="progress-photos-library">{library.map((photo) => <article key={photo.id} className="progress-photo-tile">
            {image(photo, library)}
            <div className="progress-photo-tile-footer"><div><time dateTime={photo.date}>{photoDate(photo.date)}</time><span>{label(photo.pose)}</span></div><button className="progress-photo-delete" aria-label={`Delete ${label(photo.pose).toLowerCase()} photo from ${photo.date}`} disabled={busy || removing} onClick={() => { setFeedback(null); setDeleting(photo) }}><Icon name="trash" size={17} /></button></div>
          </article>)}</div>}
      </>}
      <p className="progress-photos-storage">{cloudEnabled ? 'Photos are private and are not posted to your crew. Device-only photos stay on the device where you saved them.' : 'Photos are saved on this device and are not posted to your crew.'}</p>
      {view && <Lightbox srcs={view.srcs} start={view.start} caption={view.caption} onClose={() => setView(null)} />}
      {cam && <Camera pose={pose} onClose={() => setCam(false)} onShot={(blob) => { setCam(false); void store(blob, todayISO(), pose) }} />}
      {deleting && <ConfirmSheet title="Delete this photo?" message="This removes the photo from your library and photo storage. This can’t be undone." confirmLabel={removing ? 'Deleting…' : 'Delete photo'} onConfirm={() => void remove(deleting)} onCancel={() => { if (!deletionPending.current) setDeleting(null) }} />}
    </div>
  )
}
