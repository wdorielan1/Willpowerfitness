import { useEffect, useRef, useState } from 'react'
import { buildShareCard, type CardFormat, type WorkoutSummary } from './shareCard'
import { isPhone, loadSharePhoto, saveImageToPhotos, shareWorkoutImage } from './sharePhoto'
import { useImageAsset } from './useImageAsset'
import { WORKOUT_CARD_STYLES, type WorkoutCardStyle } from './workoutCardDesign'
import type { Settings } from './types'

function CardOption({ id, name, summary, selected, photo, photoVersion, onSelect }: {
  id: WorkoutCardStyle; name: string; summary: WorkoutSummary; selected: boolean
  photo: HTMLCanvasElement | null; photoVersion: number; onSelect: () => void
}) {
  const unavailable = id === 'pr' && !summary.prs.length
  const key = unavailable ? '' : JSON.stringify([summary, id, id === 'photo' ? photoVersion : 0])
  const { asset, error } = useImageAsset(key, () => buildShareCard(summary, 'post', { style: id, photo, width: 320 }))
  return <button type="button" className={`workout-card-option ${selected ? 'selected' : ''}`} aria-pressed={selected} aria-label={name} onClick={onSelect}>
    <span className="workout-card-thumb">
      {asset ? <img src={asset.url} alt="" /> : <span className="workout-card-placeholder">{unavailable ? <><b>YOUR NEXT PR</b><span>Unlock with a new record</span></> : error ? 'Preview unavailable' : 'Preparing…'}</span>}
      <span className="workout-card-check" aria-hidden="true">{selected ? '✓' : ''}</span>
    </span>
    <span className="workout-card-name">{name}</span>
  </button>
}

/** Always visible below stickers, both after finishing and when sharing an older workout. */
export function WorkoutCardGallery({ summary, settings, onPrefs, busy: externalBusy, crewPost }: {
  summary: WorkoutSummary; settings: Partial<Settings>; onPrefs: (patch: Partial<Settings>) => void; busy: boolean
  crewPost?: { onPost: (blob: Blob) => Promise<string | null>; label: string; disabled: boolean }
}) {
  const [style, setStyle] = useState<WorkoutCardStyle>(() => {
    const saved = settings.shareCardStyle
    return saved && WORKOUT_CARD_STYLES.some((s) => s.id === saved) && (saved !== 'pr' || summary.prs.length) ? saved : 'scorecard'
  })
  const [format, setFormat] = useState<CardFormat>(settings.shareFormat ?? (crewPost ? 'post' : 'story'))
  const [photo, setPhoto] = useState<HTMLCanvasElement | null>(null)
  const [photoVersion, setPhotoVersion] = useState(0)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [viewing, setViewing] = useState(false) // a phone that cannot hand over a picture: show it to press and hold
  const [photoError, setPhotoError] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const version = useRef(0)
  useEffect(() => () => { version.current++ }, [])
  useEffect(() => () => { if (photo) photo.width = photo.height = 0 }, [photo])
  const unavailable = style === 'pr' && !summary.prs.length
  const key = unavailable ? '' : JSON.stringify([summary, style, format, style === 'photo' ? photoVersion : 0])
  const { asset, error } = useImageAsset(key, () => buildShareCard(summary, format, { style, photo }))
  const ready = !!asset && !unavailable && (style !== 'photo' || !!photo) && !loading
  const disabled = busy || externalBusy || !ready
  const picked = WORKOUT_CARD_STYLES.find((s) => s.id === style)!
  const select = (next: WorkoutCardStyle) => { setStyle(next); onPrefs({ shareCardStyle: next }); setMessage('') }
  const addPhoto = async (file?: File) => {
    if (!file) return
    const request = ++version.current
    setLoading(true); setPhotoError(''); setMessage('')
    try {
      const decoded = await loadSharePhoto(file)
      if (request !== version.current) { decoded.width = decoded.height = 0; return }
      setPhoto(decoded); setPhotoVersion(request)
    } catch { if (request === version.current) setPhotoError('Could not open that photo. Try a JPEG or PNG from your library.') }
    finally { if (request === version.current) setLoading(false) }
  }
  // On a phone this goes to the photo library through the share sheet (a download would only make a file); on a computer it downloads.
  const save = async () => {
    if (!asset || disabled) return
    setMessage(''); setViewing(false)
    try {
      const result = await saveImageToPhotos(asset.blob, `willpower-${style}-${summary.date}-${format}.png`)
      if (result === 'view') setViewing(true)
      else if (result === 'saved') setMessage('Card downloaded. Add it to an Instagram story or post.')
    } catch { setMessage('Could not save the card. Try Share card instead.') }
  }
  const share = async () => {
    if (!asset || disabled) return
    setBusy(true); setMessage('')
    try {
      // The PNG exists before this tap, preserving native-share user activation.
      const result = await shareWorkoutImage(asset.blob, `Finished ${summary.title} on Will Power`)
      setMessage(result === 'saved' ? 'Card downloaded. Add it to an Instagram story or post.' : result === 'shared' ? 'Card shared.' : '')
    } catch { setMessage('Could not share. Try Save card instead.') }
    finally { setBusy(false) }
  }
  const post = async () => {
    if (!asset || disabled || !crewPost || crewPost.disabled) return
    setBusy(true); setMessage('')
    try { setMessage(await crewPost.onPost(asset.blob) ?? 'Card posted to your crew.') }
    catch { setMessage('Could not post. Please try again.') }
    finally { setBusy(false) }
  }
  return <section className="workout-card-gallery" aria-label="Shareable workout cards">
    <div className="share-section-heading"><div><span className="share-eyebrow">MADE TO SHARE</span><h3>Workout cards</h3></div><span className="workout-card-count">4 styles</span></div>
    <p className="share-hint">Your session, your style. Share a card to Instagram or save it for later.</p>
    <div className="workout-card-options" role="group" aria-label="Workout card style">
      {WORKOUT_CARD_STYLES.map(({ id, name }) => <CardOption key={id} id={id} name={name} summary={summary} selected={id === style} photo={photo} photoVersion={photoVersion} onSelect={() => select(id)} />)}
    </div>
    <div className="share-toolbar"><div className="share-segments share-format" role="group" aria-label="Card size">{(['story', 'post'] as const).map((value) => <button type="button" key={value} aria-pressed={format === value} className={format === value ? 'on' : ''} onClick={() => { setFormat(value); onPrefs({ shareFormat: value }); setMessage('') }}>{value === 'story' ? 'Story' : 'Post'}</button>)}</div><span className="small mute">{format === 'story' ? '9:16' : '4:5'} · 1080 px</span></div>
    {style === 'photo' && <>
      <input ref={input} className="share-file-input" type="file" accept="image/*" aria-label="Photo Flex photo" onChange={(e) => { void addPhoto(e.target.files?.[0]); e.target.value = '' }} />
      <div className="share-photo-actions"><button type="button" className="ghost" disabled={loading || busy || externalBusy} onClick={() => input.current?.click()}>{loading ? 'Opening photo…' : photo ? 'Change card photo' : 'Add card photo'}</button>{photo && <button type="button" className="quiet-button" disabled={busy || externalBusy} onClick={() => { version.current++; setPhoto(null); setPhotoVersion(version.current); setPhotoError(''); setMessage('') }}>Remove card photo</button>}</div>
      <p className="share-hint">Your photo fills the card. It stays on this device until you share it.</p>
      {photoError && <p className="err" role="alert">{photoError}</p>}
    </>}
    {unavailable ? <div className="workout-card-empty"><b>Your next record belongs here.</b><p>No new PR in this workout. Choose another card to share today’s work.</p></div>
      : <div className="workout-card-selected"><div className={`share-card-preview ${format}`}>{asset ? <img src={asset.url} alt={`${picked.name} workout card preview`} /> : <span className="share-loading">Preparing card…</span>}</div></div>}
    <p className="share-hint">{style === 'pr' && !unavailable ? 'The percentage compares estimated one-rep max with your previous best.' : picked.detail}</p>
    {crewPost && <button type="button" className="primary crew-post-button" disabled={disabled || crewPost.disabled} onClick={() => void post()}>{crewPost.label}</button>}
    {viewing && asset && <div className="save-photo" role="group" aria-label="Save the card to your photos">
      <img src={asset.url} alt="Your workout card" />
      <p><b>Press and hold the picture</b>, then choose {/iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'Add to Photos' : 'Download image'}.</p>
      <button type="button" className="quiet-button" onClick={() => setViewing(false)}>Done</button>
    </div>}
    <div className="share-actions"><button type="button" className="ghost" disabled={disabled} onClick={() => void save()}>{isPhone() ? 'Save to photos' : 'Save card'}</button><button type="button" className="primary" disabled={disabled} onClick={() => void share()}>{busy ? 'Sharing…' : 'Share card'}</button></div>
    <p className="share-hint">{isPhone() ? (/iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'Save to photos opens the share sheet: tap Save Image. Share card sends it on, like to Instagram.' : 'Save to photos opens the share sheet: pick your Photos or Gallery app. Share card sends it on, like to Instagram.') : 'Choose Instagram in your phone’s share sheet, or upload the saved card in Instagram.'}</p>
    {(error || message) && <p className={error ? 'err' : 'share-message'} role="status">{error || message}</p>}
  </section>
}
