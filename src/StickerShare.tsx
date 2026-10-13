import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { Sheet } from './components'
import { useImageAsset } from './WorkoutShare'
import type { CardFormat } from './shareCard'
import { clampPlacement, composeSharePhoto, copyWorkoutSticker, drawPhotoComposition, getFrameSize, loadSharePhoto, photoBrightness, shareWorkoutImage, stickerRect } from './sharePhoto'
import type { Settings, StickerPlacement, StickerTextColor } from './types'

type Point = { x: number; y: number }
const DEFAULT_PLACEMENT: StickerPlacement = { x: .5, y: .62, scale: .9 }

/**
 * A transparent sticker people can copy into Instagram or lay over their own photo (drag, pinch, resize),
 * then share. The sticker itself comes from `buildSticker`; everything else is the same as the workout share screen.
 */
export function StickerShareSheet({ title, intro, stickerKey, buildSticker, shareText, settings, onPrefs, onClose }: {
  title: string; intro: string
  /** changes whenever the sticker's content changes (the sticker is rebuilt when it does) */
  stickerKey: string
  buildSticker: (color: StickerTextColor) => Promise<Blob>
  shareText: string
  settings: Partial<Settings>; onPrefs: (patch: Partial<Settings>) => void; onClose: () => void
}) {
  const [color, setColor] = useState<StickerTextColor>(settings.shareStickerTextColor ?? 'white')
  const [format, setFormat] = useState<CardFormat>(settings.shareFormat ?? 'story')
  const [placement, setPlacement] = useState<StickerPlacement>(DEFAULT_PLACEMENT)
  const [photo, setPhoto] = useState<HTMLCanvasElement | null>(null)
  const [photoLoading, setPhotoLoading] = useState(false)
  const [busy, setBusy] = useState(false)
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
  const buildRef = useRef(buildSticker); buildRef.current = buildSticker

  const key = JSON.stringify([stickerKey, color])
  const { asset: sticker, error: stickerError } = useImageAsset(key, () => buildRef.current(color))
  const frame = getFrameSize(format)
  const fitted = sticker ? clampPlacement(placement, sticker.image, format) : placement
  const rect = sticker ? stickerRect(fitted, sticker.image, format) : null
  const maxScale = sticker ? clampPlacement({ ...fitted, scale: 1 }, sticker.image, format).scale : .95
  const compositionKey = JSON.stringify([key, format, fitted, photoVersion.current])
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
  }, [sticker, format])
  useEffect(() => {
    if (!photo || !sticker || !canvas.current) return
    let alive = true
    setImageError('')
    drawPhotoComposition(canvas.current, photo, sticker.image, fitted, format)
    const timer = window.setTimeout(() => {
      composeSharePhoto(photo, sticker.image, fitted, format).then((blob) => { if (alive) setComposed({ key: compositionKey, blob }) })
        .catch(() => { if (alive) setImageError('Could not prepare your photo. Try a smaller image.') })
    }, 120)
    return () => { alive = false; clearTimeout(timer) }
    // compositionKey covers the sticker, frame, placement and photo version.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compositionKey, photo, sticker])

  const move = (next: StickerPlacement) => {
    const p = sticker ? clampPlacement(next, sticker.image, format) : next
    placementRef.current = p; setPlacement(p)
  }
  const addPhoto = async (file?: File) => {
    if (!file) return
    const version = ++photoVersion.current
    setPhotoLoading(true); setMessage(''); setImageError(''); setColorNote('')
    try {
      const decoded = await loadSharePhoto(file)
      if (version !== photoVersion.current) { decoded.width = 0; decoded.height = 0; return }
      setPhoto(decoded)
    } catch { if (version === photoVersion.current) setMessage('Could not open that photo. Try a JPEG, PNG or another photo from your library.') }
    finally { if (version === photoVersion.current) setPhotoLoading(false) }
  }
  const point = (e: PointerEvent<HTMLDivElement>) => {
    const b = e.currentTarget.getBoundingClientRect()
    return { x: (e.clientX - b.left) / b.width, y: (e.clientY - b.top) / b.height }
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
      const mid = (pts: Point[]) => ({ x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 })
      const dist = (pts: Point[]) => Math.hypot((pts[0].x - pts[1].x) * frame.width, (pts[0].y - pts[1].y) * frame.height)
      const a = mid(before), b = mid(after), d = dist(before)
      const ratio = d > 1 ? dist(after) / d : 1
      move({ x: b.x + (p.x - a.x) * ratio, y: b.y + (p.y - a.y) * ratio, scale: p.scale * ratio })
    }
  }
  const pointerEnd = (e: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.delete(e.pointerId)) return
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    autoColor(photo)
  }

  // what gets shared: your photo with the sticker on it, or the sticker alone
  const output = photo ? (composed?.key === compositionKey ? composed.blob : undefined) : sticker?.blob
  const act = async (copy: boolean) => {
    const blob = copy ? sticker?.blob : output
    if (!blob) return
    setBusy(true); setMessage('')
    try {
      // start the native copy/share before any await, so the tap still counts as the trigger
      const pending = copy ? copyWorkoutSticker(blob, shareText) : shareWorkoutImage(blob, shareText)
      const result = await pending
      setMessage(result === 'copied' ? 'Copied. In Instagram, open your story and paste.' : result === 'saved' ? `${copy || !photo ? 'Sticker' : 'Picture'} downloaded. Add it to your story or post.` : result === 'shared' ? 'Shared. Nice work.' : '')
    } catch { setMessage('Could not share this image. Try again.') }
    finally { setBusy(false) }
  }
  const error = stickerError || imageError

  return (
    <Sheet title={title} onClose={onClose}>
      <div className="workout-share">
        <p className="share-intro">{intro}</p>
        <div className="share-toolbar"><span className="small mute">Sticker text</span><div className="share-colors" role="group" aria-label="Sticker text color">{(['white', 'dark'] as const).map((value) => <button type="button" key={value} aria-pressed={color === value} className={color === value ? 'on' : ''} onClick={() => { manualColor.current = true; setColorNote(''); setColor(value); onPrefs({ shareStickerTextColor: value }); setMessage('') }}><i className={value} />{value === 'white' ? 'White' : 'Dark'}</button>)}</div></div>
        {colorNote && <p className="share-hint" role="status">{colorNote}</p>}
        <div className={`share-preview-wrap ${photo ? 'with-photo' : ''}`}>
          {photo
            ? <div className={`share-photo-stage ${format}`} aria-label={`${format === 'story' ? 'Story' : 'Post'} photo preview`} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd} onLostPointerCapture={pointerEnd}>
              <canvas ref={canvas} aria-label="Your photo with the graph sticker" />
              {rect && <div className="share-sticker-handle" role="button" tabIndex={0} aria-label="Move sticker. Use arrow keys to move, plus or minus to resize." style={{ left: `${rect.x / frame.width * 100}%`, top: `${rect.y / frame.height * 100}%`, width: `${rect.width / frame.width * 100}%`, height: `${rect.height / frame.height * 100}%` }} onKeyDown={(e) => {
                const deltas: Record<string, [number, number]> = { ArrowLeft: [-.02, 0], ArrowRight: [.02, 0], ArrowUp: [0, -.02], ArrowDown: [0, .02] }
                if (deltas[e.key]) { e.preventDefault(); const [x, y] = deltas[e.key]; move({ ...fitted, x: fitted.x + x, y: fitted.y + y }) }
                if (['+', '=', '-'].includes(e.key)) { e.preventDefault(); move({ ...fitted, scale: fitted.scale + (e.key === '-' ? -.04 : .04) }) }
              }} />}
            </div>
            : <div className="share-checkerboard" aria-label="Transparent sticker preview">{sticker ? <img src={sticker.url} alt={`Progress graph sticker in ${color} text`} /> : <span className="share-loading">Preparing sticker…</span>}</div>}
        </div>
        {photo && <div className="share-toolbar"><div className="share-segments share-format" role="group" aria-label="Picture size">{(['story', 'post'] as const).map((value) => <button type="button" key={value} className={format === value ? 'on' : ''} aria-pressed={format === value} onClick={() => { setFormat(value); onPrefs({ shareFormat: value }); setMessage('') }}>{value === 'story' ? 'Story' : 'Post'}</button>)}</div><span className="small mute">{format === 'story' ? '9:16' : '4:5'}</span></div>}
        {photo && <>
          <p className="share-hint">Drag the sticker. Pinch or use the slider to resize.</p>
          <label className="share-size">Size<input type="range" aria-label="Sticker size" min={Math.min(.2, maxScale)} max={maxScale} step="0.01" value={fitted.scale} onChange={(e) => move({ ...fitted, scale: Number(e.target.value) })} /><output>{Math.round(fitted.scale * 100)}%</output></label>
        </>}
        <input ref={input} className="share-file-input" type="file" accept="image/*" aria-label="Choose your photo" onChange={(e) => { void addPhoto(e.target.files?.[0]); e.target.value = '' }} />
        <div className="share-photo-actions"><button type="button" className="ghost" disabled={photoLoading || busy} onClick={() => input.current?.click()}>{photoLoading ? 'Opening photo…' : photo ? 'Change photo' : 'Add your photo'}</button>{photo && <button type="button" className="quiet-button" onClick={() => { photoVersion.current++; setPhoto(null); setComposed(null); setImageError(''); setColorNote('') }}>Remove photo</button>}</div>
        <p className="share-hint">{photo ? 'Your photo stays on this device.' : 'Transparent PNG. Add a photo, or take it to Instagram.'}</p>
        <div className="share-actions">
          <button type="button" className="ghost" disabled={busy || !sticker} onClick={() => void act(true)}>Copy sticker</button>
          <button type="button" className="primary" disabled={busy || photoLoading || !output} onClick={() => void act(false)}>{busy ? 'Sharing…' : 'Share'}</button>
        </div>
        {(message || error) && <p className={error ? 'err' : 'share-message'} role="status">{message || error}</p>}
        <p className="share-hint">Sharing a video? Copy the sticker, then paste it over your video in Instagram.</p>
      </div>
    </Sheet>
  )
}
