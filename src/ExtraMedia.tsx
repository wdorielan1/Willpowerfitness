import { useEffect, useRef, useState } from 'react'
import { Icon } from './icons'
import { KEEP_VIDEO_DAYS, MAX_PHOTOS, MAX_PHOTOS_WITH_VIDEO, clock, prepareVideo, type PreparedVideo } from './videos'

/**
 * "Add photos" and "Add video" for a post that already has its own picture (the workout card). The card is locked to the front
 * of the post; "Unlock" lets the person slide it further back, behind the others. `taken` is how many pictures the post already
 * has, since the limits count them. `cardAt` is where the card sits among everything (0 is the front).
 */
export function ExtraMedia({ photos, onPhotos, video, onVideo, taken = 1, disabled, locked, onLocked, cardAt, onCardAt }: {
  photos: File[]; onPhotos: (next: File[]) => void; video: PreparedVideo | null; onVideo: (next: PreparedVideo | null) => void; taken?: number; disabled?: boolean
  locked: boolean; onLocked: (next: boolean) => void; cardAt: number; onCardAt: (next: number) => void
}) {
  const [previews, setPreviews] = useState<string[]>([])
  const [cover, setCover] = useState('')
  const [checking, setChecking] = useState(false)
  const [err, setErr] = useState('')
  const photoInput = useRef<HTMLInputElement>(null)
  const videoInput = useRef<HTMLInputElement>(null)
  const room = (withVideo: boolean) => (withVideo ? MAX_PHOTOS_WITH_VIDEO : MAX_PHOTOS) - taken
  useEffect(() => {
    const urls = photos.map((p) => URL.createObjectURL(p)); setPreviews(urls)
    return () => urls.forEach(URL.revokeObjectURL)
  }, [photos])
  useEffect(() => {
    if (!video?.poster) { setCover(''); return }
    const u = URL.createObjectURL(video.poster); setCover(u)
    return () => URL.revokeObjectURL(u)
  }, [video])
  const addPhotos = (picked: File[]) => {
    const left = room(!!video) - photos.length
    if (picked.length > left) setErr(left <= 0 ? 'No room for more photos.' : `You can add up to ${left} more photo${left === 1 ? '' : 's'}${video ? ' with a video' : ''}.`)
    else { onPhotos([...photos, ...picked]); setErr('') }
  }
  const addVideo = async (file?: File) => {
    if (!file) return
    if (photos.length > room(true)) { setErr(`A post with a video can have ${MAX_PHOTOS_WITH_VIDEO} pictures in all. Remove a photo first.`); return }
    setErr(''); setChecking(true)
    try { onVideo(await prepareVideo(file)) } catch (error) { setErr(error instanceof Error ? error.message : String(error)) } finally { setChecking(false) }
  }

  // everything that goes in the post, in order: the video, then the photos, with the card at the front (or where it was slid to)
  type Tile = { kind: 'video' } | { kind: 'photo'; i: number } | { kind: 'card' }
  const extras: Tile[] = [...(video ? [{ kind: 'video' } as Tile] : []), ...photos.map((_, i) => ({ kind: 'photo', i }) as Tile)]
  const at = locked ? 0 : Math.min(Math.max(0, cardAt), extras.length)
  const tiles: Tile[] = [...extras.slice(0, at), { kind: 'card' }, ...extras.slice(at)]
  const several = extras.length > 0 // with nothing else in the post there is nothing to put in order

  return (
    <div className="extra-media">
      <span className="small mute">More for your post (optional)</span>
      {several && <div className="photo-previews" aria-label="The order of your post">
        {tiles.map((t) => t.kind === 'card'
          ? <div key="card" className={`card-tile${locked ? ' locked' : ''}`}>
              <span aria-hidden="true">{locked ? '🔒' : '🏋️'}</span><b>Workout card</b>
              {!locked && <span className="card-tile-moves">
                <button type="button" disabled={disabled || at === 0} aria-label="Move the workout card earlier" onClick={() => onCardAt(at - 1)}><Icon name="back" size={16} /></button>
                <button type="button" disabled={disabled || at === extras.length} aria-label="Move the workout card later" onClick={() => onCardAt(at + 1)}><Icon name="chevron" size={16} /></button>
              </span>}
            </div>
          : t.kind === 'video'
            ? <div key="video" className="video-cover">
                {cover ? <img src={cover} alt="Cover of your video" /> : <span className="video-cover-blank" role="img" aria-label="Video selected"><Icon name="video" size={26} /></span>}
                <span className="post-video-time">{video!.seconds ? clock(video!.seconds) : `${Math.max(1, Math.round(video!.file.size / 1048576))} MB`}</span>
                <button type="button" disabled={disabled} aria-label="Remove video" onClick={() => onVideo(null)}><Icon name="close" size={16} /></button>
              </div>
            : <div key={previews[t.i] ?? t.i}>
                <img src={previews[t.i]} alt={`Extra photo ${t.i + 1}`} />
                <button type="button" disabled={disabled} aria-label={`Remove extra photo ${t.i + 1}`} onClick={() => onPhotos(photos.filter((_, j) => j !== t.i))}><Icon name="close" size={16} /></button>
              </div>)}
      </div>}
      {several && <div className="row card-lock">
        <span className="small mute">{locked ? 'The workout card is locked to the front of your post.' : 'Slide the card with the arrows.'}</span>
        <button type="button" className="quiet-button" disabled={disabled} aria-pressed={!locked} onClick={() => { onLocked(!locked); if (!locked) onCardAt(0) }}>{locked ? 'Unlock' : 'Lock to front'}</button>
      </div>}
      <input ref={photoInput} type="file" accept="image/*" multiple hidden aria-label="Add photos to the post" disabled={disabled} onChange={(e) => { addPhotos(Array.from(e.target.files ?? [])); e.target.value = '' }} />
      <input ref={videoInput} type="file" accept="video/*" hidden aria-label="Add a video to the post" disabled={disabled} onChange={(e) => { void addVideo(e.target.files?.[0]); e.target.value = '' }} />
      <div className="row wrap composer-actions">
        <button type="button" className="ghost small-btn" disabled={disabled || photos.length >= room(!!video)} onClick={() => photoInput.current?.click()}><Icon name="photo" size={18} /> Add photos</button>
        <button type="button" className="ghost small-btn" disabled={disabled || checking || !!video} onClick={() => videoInput.current?.click()}><Icon name="video" size={18} />{checking ? 'Checking…' : 'Add video'}</button>
      </div>
      {video && <p className="small mute">Videos are kept for {KEEP_VIDEO_DAYS} days, then deleted; the post and its photos stay.</p>}
      {err && <p role="alert" className="err small">{err}</p>}
    </div>
  )
}
