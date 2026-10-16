import { useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { Sheet } from './components'
import { fmtDuration, type CardFormat, type WorkoutSummary } from './shareCard'
import { WorkoutCardGallery } from './WorkoutCardGallery'
import { useImageAsset } from './useImageAsset'
import { buildWorkoutSticker } from './shareSticker'
import { clampPlacement, composeSharePhoto, copyWorkoutSticker, drawPhotoComposition, getFrameSize, loadSharePhoto, photoBrightness, shareWorkoutImage, stickerRect } from './sharePhoto'
import { PostTo, type MyCrew } from './CrewPicker'
import { ExtraMedia } from './ExtraMedia'
import type { PreparedVideo } from './videos'
import { fromISO, todayISO } from './engine'
import type { Settings, StickerPlacement, StickerStyle, StickerTextColor } from './types'

type Point = { x: number; y: number }
const DEFAULT_PLACEMENT: StickerPlacement = { x: .5, y: .72, scale: .8 }
const STYLES: [StickerStyle, string][] = [['minimal', 'Minimal'], ['performance', 'Performance'], ['full', 'Full recap']]

/**
 * The share screen after a workout. With `crewPost`, the same screen posts the picture to the crew
 * (a card, or your own photo with a sticker on top) instead of sending it to Instagram.
 */
export function DoneSheet({ summary, settings, onPrefs, onClose, crewPost, extra }: {
  summary: WorkoutSummary; settings: Partial<Settings>; onPrefs: (patch: Partial<Settings>) => void; onClose: () => void
  /** `crews` are the crews you are in; `done` already have this workout; `defaultTo` is picked to start with. */
  crewPost?: { crews: MyCrew[]; done: string[]; defaultTo?: string; /** `place` is the gym or town shown on the picture, if the person left it on: the post's header says it too. */
    onPost: (blob: Blob, crewIds: string[], opts?: { place?: string; caption?: string; photos?: File[]; video?: PreparedVideo; progress?: (text: string) => void }) => Promise<string | null> }
  /** Something to show right under the recap, such as the offer to save this workout. */
  extra?: ReactNode
}) {
  const [style, setStyle] = useState<StickerStyle>(settings.shareStickerStyle ?? 'minimal')
  const [color, setColor] = useState<StickerTextColor>(settings.shareStickerTextColor ?? 'white')
  const [format, setFormat] = useState<CardFormat>(crewPost ? 'post' : settings.shareFormat ?? 'story')
  const [placement, setPlacement] = useState<StickerPlacement>(settings.shareStickerPlacement ?? DEFAULT_PLACEMENT)
  const [photo, setPhoto] = useState<HTMLCanvasElement | null>(null)
  const [photoLoading, setPhotoLoading] = useState(false)
  const [showPlace, setShowPlace] = useState(!!summary.place)
  const [place, setPlace] = useState(summary.place ?? '')
  const [busy, setBusy] = useState(false)
  // the crews it goes to: the one you opened this from, unless you pick others (never one that already has it)
  const [to, setTo] = useState<string[]>(() => {
    const free = (crewPost?.crews ?? []).map((c) => c.id).filter((id) => !crewPost?.done.includes(id))
    return crewPost?.defaultTo && free.includes(crewPost.defaultTo) ? [crewPost.defaultTo] : free.slice(0, 1)
  })
  const [caption, setCaption] = useState('')
  const [morePhotos, setMorePhotos] = useState<File[]>([]) // photos and a video that go in the post next to the picture
  const [moreVideo, setMoreVideo] = useState<PreparedVideo | null>(null)
  const [progress, setProgress] = useState('Posting…')
  const [message, setMessage] = useState('')
  const [imageError, setImageError] = useState('')
  const [composed, setComposed] = useState<{ key: string; blob: Blob } | null>(null)
  const [colorNote, setColorNote] = useState('')
  const manualColor = useRef(false)
  const canvas = useRef<HTMLCanvasElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const photoVersion = useRef(0)
  const pointers = useRef(new Map<number, Point>())
  const placementRef = useRef(placement)
  const prefsRef = useRef(onPrefs); prefsRef.current = onPrefs
  const card = useMemo(() => ({ ...summary, place: showPlace ? place.trim() || undefined : undefined }), [summary, showPlace, place])
  const stickerKey = JSON.stringify([card, style, color])
  const { asset: sticker, error: stickerError } = useImageAsset(stickerKey, () => buildWorkoutSticker(card, style, color))
  const frame = getFrameSize(format)
  const fitted = sticker ? clampPlacement(placement, sticker.image, format) : placement
  const rect = sticker ? stickerRect(fitted, sticker.image, format) : null
  const maxScale = sticker ? clampPlacement({ ...fitted, scale: 1 }, sticker.image, format).scale : .95
  const compositionKey = JSON.stringify([stickerKey, format, fitted, photoVersion.current])
  const rectRef = useRef(rect); rectRef.current = rect
  const colorRef = useRef(color); colorRef.current = color

  // Pick readable text for the photo under the sticker, until the person chooses a color themselves.
  const autoColor = (source: HTMLCanvasElement | null) => {
    if (!source || manualColor.current || !rectRef.current) return
    const brightness = photoBrightness(source, rectRef.current, format)
    const next: StickerTextColor | null = brightness > 0.6 ? 'dark' : brightness < 0.45 ? 'white' : null
    if (!next || next === colorRef.current) return
    setColor(next)
    setColorNote(next === 'dark' ? 'Dark text picked for this bright photo. Switch anytime.' : 'White text picked for this dark photo. Switch anytime.')
  }

  useEffect(() => () => { photoVersion.current++ }, [])
  useEffect(() => () => { if (photo) { photo.width = 0; photo.height = 0 } }, [photo])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { autoColor(photo) }, [photo, sticker?.key, format])
  useEffect(() => {
    if (!sticker) return
    const p = clampPlacement(placementRef.current, sticker.image, format)
    placementRef.current = p; setPlacement(p)
    prefsRef.current({ shareStickerPlacement: p })
  }, [sticker, format])
  useEffect(() => {
    if (!photo || !sticker || !canvas.current) return
    let alive = true
    setImageError('')
    drawPhotoComposition(canvas.current, photo, sticker.image, fitted, format)
    const timer = window.setTimeout(() => {
      composeSharePhoto(photo, sticker.image, fitted, format).then((blob) => {
        if (alive) setComposed({ key: compositionKey, blob })
      }).catch(() => { if (alive) setImageError('Could not prepare your photo. Try a smaller image.') })
    }, 120)
    return () => { alive = false; clearTimeout(timer) }
    // compositionKey includes the sticker, frame, placement and photo version.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compositionKey, photo, sticker])

  const move = (next: StickerPlacement, persist = false) => {
    const p = sticker ? clampPlacement(next, sticker.image, format) : next
    placementRef.current = p; setPlacement(p)
    if (persist) onPrefs({ shareStickerPlacement: p })
  }
  const pickFormat = (value: CardFormat) => { setFormat(value); if (!crewPost) onPrefs({ shareFormat: value }); setMessage('') }
  const addPhoto = async (file?: File) => {
    if (!file) return
    const version = ++photoVersion.current
    setPhotoLoading(true); setMessage(''); setImageError('')
    try {
      const decoded = await loadSharePhoto(file)
      if (version !== photoVersion.current) { decoded.width = 0; decoded.height = 0; return }
      setColorNote('')
      setPhoto(decoded)
    } catch { if (version === photoVersion.current) setMessage('Could not open that photo. Try a JPEG, PNG or another photo from your library.') }
    finally { if (version === photoVersion.current) setPhotoLoading(false) }
  }
  const point = (e: PointerEvent<HTMLDivElement>) => {
    const bounds = e.currentTarget.getBoundingClientRect()
    return { x: (e.clientX - bounds.left) / bounds.width, y: (e.clientY - bounds.top) / bounds.height }
  }
  const pointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!photo || !sticker || !rect || busy) return
    const p = point(e)
    if (!pointers.current.size && (p.x * frame.width < rect.x || p.x * frame.width > rect.x + rect.width || p.y * frame.height < rect.y || p.y * frame.height > rect.y + rect.height)) return
    if (pointers.current.size >= 2) return
    e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, p)
  }
  const pointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const previous = pointers.current.get(e.pointerId)
    if (!previous) return
    e.preventDefault()
    const before = [...pointers.current.values()]
    pointers.current.set(e.pointerId, point(e))
    const after = [...pointers.current.values()]
    const p = placementRef.current
    if (after.length === 1) move({ ...p, x: p.x + after[0].x - previous.x, y: p.y + after[0].y - previous.y })
    else {
      const midpoint = (points: Point[]) => ({ x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 })
      const distance = (points: Point[]) => Math.hypot((points[0].x - points[1].x) * frame.width, (points[0].y - points[1].y) * frame.height)
      const a = midpoint(before), b = midpoint(after), d = distance(before)
      const ratio = d > 1 ? distance(after) / d : 1
      move({ x: b.x + (p.x - a.x) * ratio, y: b.y + (p.y - a.y) * ratio, scale: p.scale * ratio })
    }
  }
  const pointerEnd = (e: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.delete(e.pointerId)) return
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    onPrefs({ shareStickerPlacement: placementRef.current })
    autoColor(photo)
  }
  // for the crew feed there is no transparent-sticker option: it needs a card or a photo
  // Sticker tools share either the transparent PNG or your composed photo.
  const output = photo ? composed?.key === compositionKey ? composed.blob : undefined : sticker?.blob
  // The separate card gallery passes its rendered card to postToCrew.
  const crewOutput = photo ? output : undefined
  const shareText = `Finished ${summary.title}${summary.minutes ? ` in ${summary.minutes} min` : ''} on Will Power`
  const open = crewPost ? crewPost.crews.filter((c) => !crewPost.done.includes(c.id)) : []
  const going = to.filter((id) => open.some((c) => c.id === id))
  const allPosted = !!crewPost && open.length === 0
  const several = (crewPost?.crews.length ?? 0) > 1
  const postLabel = busy ? 'Posting…' : allPosted ? (several ? '✓ Posted to all your crews' : '✓ Posted to your crew') : several ? (going.length === 1 ? `Post to ${open.find((c) => c.id === going[0])?.name ?? 'crew'}` : `Post to ${going.length} crews`) : 'Post to crew'
  const postToCrew = async (cardBlob?: Blob) => {
    const image = cardBlob ?? crewOutput
    if (!crewPost || allPosted || !image || busy || !going.length) return 'Choose an available crew and try again.'
    setBusy(true); setMessage('')
    if (showPlace) onPrefs({ gymName: place.trim() })
    const failed = await crewPost.onPost(image, going, { ...(showPlace && place.trim() ? { place: place.trim() } : {}), ...(caption.trim() ? { caption: caption.trim() } : {}), ...(morePhotos.length ? { photos: morePhotos } : {}), ...(moreVideo ? { video: moreVideo } : {}), progress: setProgress }).catch(() => 'Could not post. Please try again.')
    setBusy(false)
    if (failed) setMessage(failed); else onClose()
    return failed
  }
  const act = async (copy: boolean) => {
    const blob = copy ? sticker?.blob : output
    if (!blob) return
    setBusy(true); setMessage('')
    try {
      // Start native operations before any await; both blobs are already generated.
      const pending = copy ? copyWorkoutSticker(blob, shareText) : shareWorkoutImage(blob, shareText)
      if (showPlace) onPrefs({ gymName: place.trim() })
      const result = await pending
      setMessage(result === 'copied' ? 'Copied. In Instagram, open your story and paste.' : result === 'saved' ? `${copy || !photo ? 'Sticker' : 'Picture'} downloaded. Add it to your story or post.` : result === 'shared' ? 'Shared. Nice work.' : '')
    } catch { setMessage('Could not share this image. Try again.') }
    finally { setBusy(false) }
  }
  const error = stickerError || imageError
  const momentum: [string, string][] = []
  if (summary.volumeChangePct !== null && summary.volumeChangePct !== 0) momentum.push([`${summary.volumeChangePct > 0 ? '▲' : '▼'} ${Math.abs(summary.volumeChangePct)}% volume vs your last ${summary.title.toLowerCase()}`, summary.volumeChangePct > 0 ? 'up' : ''])
  if (summary.streak > 1) momentum.push([`${summary.streak}-day streak`, 'streak'])

  return <Sheet title={crewPost ? 'Share to your crew' : 'Workout complete'} onClose={onClose}>
    <div className="workout-share">
      <p className="share-intro"><b>{summary.title}</b> {summary.date === todayISO() ? 'finished at' : `from ${fromISO(summary.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}, finished at`} {new Date(summary.finishedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}<span>{crewPost ? 'Post a picture to your crew, or share it to Instagram.' : 'Your work. Your photo. Your people.'}</span></p>
      <div className="share-recap">
        <div className="share-recap-stats">
          <div className="stat"><b>{fmtDuration(summary.minutes)}</b><span>time</span></div>
          <div className="stat"><b>{summary.volume.toLocaleString()}</b><span>lb moved</span></div>
          <div className="stat"><b>{summary.sets}</b><span>sets</span></div>
        </div>
        {momentum.length > 0 && <p className="share-recap-line">{momentum.map(([text, cls]) => <span key={text} className={cls}>{text}</span>)}</p>}
        {summary.prs.length > 0
          ? <div className="done-prs">
              {summary.prs.slice(0, 3).map((pr) => <div key={pr.name} className="done-pr"><span><b>{pr.name}</b><span className="small mute">New PR · {pr.weight} lb × {pr.reps}</span></span><span className="done-pct">+{pr.pct}%</span></div>)}
              {summary.prs.length > 3 && <p className="small mute" style={{ margin: 0 }}>+{summary.prs.length - 3} more PR{summary.prs.length - 3 === 1 ? '' : 's'}. Pick Full recap to share them all.</p>}
            </div>
          : <p className="small mute" style={{ margin: 0 }}>No new records today. Showing up is what builds them.</p>}
      </div>
      {extra}
      {crewPost && <PostTo crews={crewPost.crews} value={going} onChange={setTo} done={crewPost.done} disabled={busy} />}
      {crewPost && <label className="share-caption"><span className="small mute">Caption (optional)</span><textarea value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={500} rows={2} placeholder="Say something about this workout…" disabled={busy} aria-label="Caption" /></label>}
      {crewPost && <ExtraMedia photos={morePhotos} onPhotos={setMorePhotos} video={moreVideo} onVideo={setMoreVideo} disabled={busy || allPosted} />}
      <div className="share-section-heading"><div><span className="share-eyebrow">MAKE IT YOURS</span><h3>Workout stickers</h3></div><span className="small mute">Transparent PNG</span></div>
      <div className="share-segments" role="group" aria-label="Sticker style">{STYLES.map(([value, label]) => <button type="button" key={value} className={style === value ? 'on' : ''} aria-pressed={style === value} onClick={() => { setStyle(value); onPrefs({ shareStickerStyle: value }); setMessage('') }}>{label}</button>)}</div>
      <div className="share-toolbar"><span className="small mute">Sticker text</span><div className="share-colors" role="group" aria-label="Sticker text color">{(['white', 'dark'] as const).map((value) => <button type="button" key={value} aria-pressed={color === value} className={color === value ? 'on' : ''} onClick={() => { manualColor.current = true; setColorNote(''); setColor(value); onPrefs({ shareStickerTextColor: value }); setMessage('') }}><i className={value} />{value === 'white' ? 'White' : 'Dark'}</button>)}</div></div>
      {colorNote && <p className="share-hint" role="status">{colorNote}</p>}
      <div className={`share-preview-wrap ${photo ? 'with-photo' : ''}`}>
        {photo ? <div className={`share-photo-stage ${format}`} aria-label={`${format === 'story' ? 'Story' : 'Post'} photo preview`} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd} onLostPointerCapture={pointerEnd}>
            <canvas ref={canvas} aria-label="Your photo with workout sticker" />
            {rect && <div className="share-sticker-handle" role="button" tabIndex={0} aria-label="Move sticker. Use arrow keys to move, plus or minus to resize." style={{ left: `${rect.x / frame.width * 100}%`, top: `${rect.y / frame.height * 100}%`, width: `${rect.width / frame.width * 100}%`, height: `${rect.height / frame.height * 100}%` }} onKeyDown={(e) => {
              const deltas: Record<string, [number, number]> = { ArrowLeft: [-.02, 0], ArrowRight: [.02, 0], ArrowUp: [0, -.02], ArrowDown: [0, .02] }
              if (deltas[e.key]) { e.preventDefault(); const [x, y] = deltas[e.key]; move({ ...fitted, x: fitted.x + x, y: fitted.y + y }, true) }
              if (['+', '=', '-'].includes(e.key)) { e.preventDefault(); move({ ...fitted, scale: fitted.scale + (e.key === '-' ? -.04 : .04) }, true) }
            }} />}
          </div> : <div className="share-checkerboard" aria-label="Transparent sticker preview">{sticker ? <img src={sticker.url} alt={`${STYLES.find(([v]) => v === style)?.[1]} workout sticker in ${color} text`} /> : <span className="share-loading">Preparing sticker…</span>}</div>}
      </div>
      {photo && <div className="share-toolbar"><div className="share-segments share-format" role="group" aria-label="Picture size">{(['story', 'post'] as const).map((value) => <button type="button" key={value} className={format === value ? 'on' : ''} aria-pressed={format === value} onClick={() => pickFormat(value)}>{value === 'story' ? 'Story' : 'Post'}</button>)}</div><span className="small mute">{format === 'story' ? '9:16' : '4:5'}</span></div>}
      {photo && <>
        <p className="share-hint">Drag the sticker. Pinch or use the slider to resize.</p>
        <label className="share-size">Size<input type="range" aria-label="Sticker size" min={Math.min(.2, maxScale)} max={maxScale} step="0.01" value={fitted.scale} onChange={(e) => move({ ...fitted, scale: Number(e.target.value) }, true)} /><output>{Math.round(fitted.scale * 100)}%</output></label>
      </>}
      <input ref={input} className="share-file-input" type="file" accept="image/*" aria-label="Choose your photo" onChange={(e) => { void addPhoto(e.target.files?.[0]); e.target.value = '' }} />
      <div className="share-photo-actions"><button type="button" className="ghost" disabled={photoLoading || busy} onClick={() => input.current?.click()}>{photoLoading ? 'Opening photo…' : photo ? 'Change photo' : 'Add your photo'}</button>{photo && <button type="button" className="quiet-button" onClick={() => { photoVersion.current++; setPhoto(null); setComposed(null); setImageError(''); setColorNote('') }}>Remove photo</button>}</div>
      <p className="share-hint">{photo ? (crewPost ? 'Your photo stays on this device unless you post it to your crew.' : 'Your photo stays on this device.') : crewPost ? 'Add your photo, then post it to your crew or Instagram.' : 'Transparent PNG. Add a photo, or take it to Instagram.'}</p>
      {crewPost && busy && <p className="small mute" role="status">{progress}</p>}
      {crewPost && photo && <button type="button" className={`primary crew-post-button ${allPosted ? 'is-posted' : ''}`} disabled={busy || photoLoading || !crewOutput || allPosted || !going.length} onClick={() => void postToCrew()}>{postLabel}</button>}
      <div className="share-actions">
        <button type="button" className="ghost" disabled={busy || !sticker} onClick={() => void act(true)}>Copy sticker</button>
        <button type="button" className={crewPost ? 'ghost' : 'primary'} disabled={busy || photoLoading || !output} onClick={() => void act(false)}>{busy && !crewPost ? 'Sharing…' : crewPost ? 'Share to Instagram' : 'Share'}</button>
      </div>
      {(message || error) && <p className={error ? 'err' : 'share-message'} role="status">{message || error}</p>}
      <p className="share-hint">Sharing a video? Copy the sticker, then paste it over your video in Instagram.</p>
      <details className="share-place"><summary>Place (optional)</summary><label className="share-place-toggle"><input type="checkbox" checked={showPlace} onChange={(e) => setShowPlace(e.target.checked)} />Include a gym or town</label>{showPlace && <input value={place} onChange={(e) => setPlace(e.target.value)} onBlur={() => onPrefs({ gymName: place.trim() })} placeholder="Type a gym or town" maxLength={40} aria-label="Where you trained" />}</details>
      <WorkoutCardGallery summary={card} settings={settings} onPrefs={onPrefs} busy={busy}
        crewPost={crewPost ? { onPost: postToCrew, label: postLabel, disabled: allPosted || !going.length } : undefined} />
    </div>
  </Sheet>
}
