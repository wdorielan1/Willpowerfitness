import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useApp } from '../store'
import { Avatar, ConfirmSheet, Lightbox } from '../components'
import { CommentThread } from '../Comments'
import { LikersSheet, type LikerRow } from '../Likers'
import { DoneSheet } from '../WorkoutShare'
import { summaryFromLog } from '../shareCard'
import { announceFeedChanged, createPostCloud, deletePostCloud, ensureMemberCloud, fetchPostLikers, toggleLikeCloud, useCrewAvatars, useCrewFeed } from '../cloud'
import { CREW_BUCKET, postPhotos, postVideo, compress, deletePhotoBlob, savePhotoBlob, saveVideoBlob, usePhotoUrls, videoUrl } from '../photos'
import { KEEP_VIDEO_DAYS, MAX_PHOTOS, MAX_PHOTOS_WITH_VIDEO, clock, prepareVideo, videoDaysLeft, type PreparedVideo } from '../videos'
import { Icon } from '../icons'
import { todayISO } from '../engine'
import type { CrewPost, PostKind, VideoMeta } from '../types'

const timeAgo = (ts: number) => {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000))
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

/** Create posts in a crew's feed (cloud when connected, on-device otherwise). */
export function usePostActions(crewId: string) {
  const { data, update, userId } = useApp()
  const feed = useCrewFeed(crewId, userId)
  const name = data.name || 'Member'
  const post = async (p: { kind: PostKind; text: string; photos?: Blob[]; video?: PreparedVideo; meta?: Record<string, unknown>; progress?: (text: string) => void }): Promise<string | null> => {
    const imagePaths: string[] = [], imageIds: string[] = []
    const uploaded: { id: string; path?: string }[] = []
    let meta = p.meta
    try {
      if ((p.photos?.length ?? 0) > MAX_PHOTOS) throw new Error(`Choose up to ${MAX_PHOTOS} photos.`)
      if (p.video && (p.photos?.length ?? 0) > MAX_PHOTOS_WITH_VIDEO) throw new Error(`Choose up to ${MAX_PHOTOS_WITH_VIDEO} photos with a video.`)
      if (userId) {
        p.progress?.('Confirming membership…')
        const m = await ensureMemberCloud(crewId, userId, name)
        if (m) throw new Error(`Couldn’t confirm your crew membership: ${m}`)
      }
      if (p.video) { // the clip goes up first; its still frame is saved like a photo, ahead of the post's own photos, and becomes the cover
        const size = `${Math.max(1, Math.round(p.video.file.size / 1048576))} MB`
        p.progress?.(`Uploading video (${size})…`)
        const vid = crypto.randomUUID()
        const r = await saveVideoBlob(vid, p.video.file, p.video.type, userId, userId ? `${crewId}/${userId}` : '', (pct) => p.progress?.(`Uploading video ${pct}% of ${size}`))
        uploaded.push({ id: vid, path: r.path })
        const clip: VideoMeta = { ...(r.path ? { path: r.path } : { id: vid }), type: p.video.type, seconds: p.video.seconds, size: p.video.file.size, cover: !!p.video.poster }
        meta = { ...meta, video: clip }
      }
      const stills = [...(p.video?.poster ? [p.video.poster] : []), ...(p.photos ?? [])]
      for (const [i, photo] of stills.entries()) {
        p.progress?.(p.video && !p.photos?.length ? 'Finishing…' : `Uploading ${i + 1} of ${stills.length}`)
        const small = await compress(photo)
        const id = crypto.randomUUID()
        const r = await savePhotoBlob(id, small, userId, CREW_BUCKET, userId ? `${crewId}/${userId}` : '')
        uploaded.push({ id, path: r.path })
        if (userId) {
          if (!r.path) throw new Error(r.error || 'Photo upload failed.')
          imagePaths.push(r.path)
        } else imageIds.push(id)
      }
      p.progress?.('Posting…')
      if (userId) {
        const error = await createPostCloud({ crewId, userId, name, kind: p.kind, text: p.text, imagePaths, meta, isPublic: !!data.profilePublic })
        if (error) throw new Error(error)
        feed?.refresh()
      } else {
        const local: CrewPost = { id: crypto.randomUUID(), crewId, name, kind: p.kind, text: p.text, imagePaths, imageIds, meta, ts: Date.now(), mine: true, likes: 0, liked: false }
        update((d) => ({ ...d, posts: [local, ...d.posts] }))
      }
      return null
    } catch (error) {
      // Remove earlier photos if a later upload or the row insert fails.
      await Promise.allSettled(uploaded.map((p) => deletePhotoBlob(p, CREW_BUCKET)))
      return error instanceof Error ? error.message : String(error)
    }
  }
  return { post, feed }
}

/** The "share something" box. It sits at the top of the crew page; the posts below it live in Feed. */
export function FeedComposer({ crewId }: { crewId: string }) {
  const { data, update } = useApp()
  const { post } = usePostActions(crewId)
  const [text, setText] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [video, setVideo] = useState<PreparedVideo | null>(null)
  const [videoCover, setVideoCover] = useState('')
  const [checking, setChecking] = useState(false)
  const videoFile = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (!video?.poster) { setVideoCover(''); return }
    const u = URL.createObjectURL(video.poster); setVideoCover(u)
    return () => URL.revokeObjectURL(u)
  }, [video])
  const pickVideo = async (f?: File) => {
    if (!f) return
    if (photos.length > MAX_PHOTOS_WITH_VIDEO) { setErr(`A post with a video can have up to ${MAX_PHOTOS_WITH_VIDEO} photos. Remove some photos first.`); return }
    setErr(''); setChecking(true)
    try { setVideo(await prepareVideo(f)) } catch (error) { setErr(error instanceof Error ? error.message : String(error)) } finally { setChecking(false) }
  }
  const [progress, setProgress] = useState('Posting…')
  const posting = useRef(false)
  useEffect(() => {
    const urls = photos.map((p) => URL.createObjectURL(p)); setPreviews(urls)
    return () => urls.forEach(URL.revokeObjectURL)
  }, [photos])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const file = useRef<HTMLInputElement>(null)
  const today = todayISO()
  const todaysLog = data.logs.find((l) => l.date === today && !l.baseline && !l.imported)
  // one workout share per crew per day (the automatic share on finishing uses the main crew's key)
  const sharedKey = crewId === data.primary ? today : `${today}|${crewId}`
  const shared = !!data.workoutPosted?.[sharedKey]
  const [askShare, setAskShare] = useState(false)
  const [sharedNote, setSharedNote] = useState(false)

  /** Posts the box's text and photos, or the given post. Returns an error message, or null when it posted. */
  const submit = async (override?: { kind: PostKind; text: string; meta?: Record<string, unknown>; photos?: Blob[] }): Promise<string | null> => {
    if (posting.current) return 'Already posting. One moment.'
    const selected = override ? (override.photos ?? []) : photos
    const clip = override ? undefined : video ?? undefined
    const body = override ?? { kind: (clip ? 'video' : selected.length ? 'photo' : 'post') as PostKind, text: text.trim() }
    if (!body.text && !selected.length && !clip) return 'Nothing to post.'
    posting.current = true; setBusy(true); setErr(''); setProgress('Posting…')
    try {
      const error = await post({ ...body, photos: selected, video: clip, progress: setProgress })
      if (error) { setErr(error); return error }
      if (!override) { setText(''); setPhotos([]); setVideo(null) }
      announceFeedChanged()
      return null
    } catch (error) { const m = error instanceof Error ? error.message : String(error); setErr(m); return m }
    finally { posting.current = false; setBusy(false) }
  }

  /** Post today's workout, with the picture the person chose, to this crew (once a day). */
  const shareWorkout = async (blob: Blob): Promise<string | null> => {
    if (!todaysLog || shared) return 'Today\u2019s workout is already shared with this crew.'
    const sets = todaysLog.entries.reduce((a, e) => a + e.sets.length, 0)
    const vol = todaysLog.entries.reduce((a, e) => a + e.sets.reduce((s, x) => s + x.weight * x.reps, 0), 0)
    const error = await submit({ kind: 'workout', text: `Finished ${todaysLog.dayType}${todaysLog.minutes ? ` in ${todaysLog.minutes} min` : ''}`, meta: { sets, volume: Math.round(vol), exercises: todaysLog.entries.length }, photos: [blob] })
    if (!error) {
      update((d) => ({ ...d, workoutPosted: { ...d.workoutPosted, [sharedKey]: true } }))
      setSharedNote(true); setTimeout(() => setSharedNote(false), 5000)
    }
    return error
  }
  const shareSummary = askShare && todaysLog ? summaryFromLog(data, todaysLog) : null

  return (
    <>
      <section className="card feed-composer">
        <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Share something with your crew..." maxLength={1000} />
        {(video || previews.length > 0) && <div className="photo-previews">
          {video && <div className="video-cover">
            {videoCover ? <img src={videoCover} alt="Cover of your video" /> : <span className="video-cover-blank" role="img" aria-label="Video selected"><Icon name="video" size={26} /></span>}
            <span className="post-video-time">{video.seconds ? clock(video.seconds) : `${Math.max(1, Math.round(video.file.size / 1048576))} MB`}</span>
            <button disabled={busy} aria-label="Remove video" onClick={() => setVideo(null)}><Icon name="close" size={16} /></button>
          </div>}
          {previews.map((src, i) => <div key={src}>
            <img src={src} alt={`Selected photo ${i + 1}`} />
            <button disabled={busy} aria-label={`Remove photo ${i + 1}`} onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}><Icon name="close" size={16} /></button>
          </div>)}
        </div>}
        {video && <p className="small mute">A video can go with up to {MAX_PHOTOS_WITH_VIDEO} photos. Videos are kept for {KEEP_VIDEO_DAYS} days, then deleted; the post and its photos stay.</p>}
        <input ref={file} type="file" accept="image/*" multiple disabled={busy} hidden onChange={(e) => {
          const picked = Array.from(e.target.files ?? [])
          if (picked.length + photos.length > (video ? MAX_PHOTOS_WITH_VIDEO : MAX_PHOTOS)) setErr(video ? `Choose up to ${MAX_PHOTOS_WITH_VIDEO} photos with a video.` : `Choose up to ${MAX_PHOTOS} photos.`)
          else { setPhotos((p) => [...p, ...picked]); setErr('') }
          e.target.value = ''
        }} />
        <input ref={videoFile} type="file" accept="video/*" disabled={busy} hidden onChange={(e) => { void pickVideo(e.target.files?.[0]); e.target.value = '' }} />
        <div className="row wrap composer-actions">
          <button className="ghost small-btn" disabled={busy || photos.length >= (video ? MAX_PHOTOS_WITH_VIDEO : MAX_PHOTOS)} onClick={() => file.current?.click()}><Icon name="photo" size={18} /> Add photos</button>
          <button className="ghost small-btn" disabled={busy || checking || !!video} onClick={() => videoFile.current?.click()}><Icon name="video" size={18} />{checking ? 'Checking…' : 'Add video'}</button>
          {todaysLog && <button className="ghost small-btn" onClick={() => setAskShare(true)} disabled={busy}><Icon name={shared ? 'check' : 'weight'} size={18} />Share workout</button>}
          <span style={{ flex: 1 }} />
          <button className="primary small-btn" onClick={() => void submit()} disabled={busy || checking || (!text.trim() && !photos.length && !video)}>{busy ? progress : 'Post'}</button>
        </div>
        {busy && <p className="small mute" role="status">{progress}</p>}
        {err && <p role="alert" className="err small">{err}</p>}
        {sharedNote && <p className="small ok-text" role="status">Shared. Your crew can see your workout now.</p>}
      </section>
      {shareSummary && <DoneSheet summary={shareSummary} settings={data.settings} onPrefs={(patch) => update((d) => ({ ...d, settings: { ...d.settings, ...patch } }))} onClose={() => setAskShare(false)} crewPost={{ onPost: shareWorkout, alreadyPosted: shared }} />}
    </>
  )
}

export default function Feed({ crewId }: { crewId: string }) {
  const { data, update, userId, avatarUrl } = useApp()
  const crewAvatars = useCrewAvatars(crewId)
  const { feed } = usePostActions(crewId)
  const [err, setErr] = useState('')
  const [del, setDel] = useState<CrewPost | null>(null)
  const [big, setBig] = useState<{ srcs: string[]; start: number } | null>(null)
  const [watch, setWatch] = useState<{ video: VideoMeta; cover?: string } | null>(null) // a clip open full screen
  const posts = feed ? feed.posts : data.posts.filter((p) => p.crewId === crewId).sort((a, b) => b.ts - a.ts)
  const urls = usePhotoUrls(posts.flatMap(postPhotos), CREW_BUCKET)

  const [likers, setLikers] = useState<{ title: string; people: LikerRow[] | null } | null>(null)
  const showLikers = (p: CrewPost) => {
    if (!userId) return
    setLikers({ title: 'Liked by', people: null })
    void fetchPostLikers(p.id, p.crewId).then((people) => setLikers({ title: 'Liked by', people })).catch(() => setLikers({ title: 'Liked by', people: [] }))
  }
  const like = (p: CrewPost) => {
    if (userId) { void toggleLikeCloud(p.id, userId, p.liked).then(() => feed?.refresh()); return }
    update((d) => ({ ...d, posts: d.posts.map((x) => (x.id === p.id ? { ...x, liked: !x.liked, likes: x.likes + (x.liked ? -1 : 1) } : x)) }))
  }
  const remove = async (p: CrewPost) => {
    try {
      if (userId) await deletePostCloud(p.id)
      else {
        const clip = postVideo(p.meta)
        await Promise.all([...postPhotos(p), ...(clip?.id ? [{ id: clip.id }] : [])].map((photo) => deletePhotoBlob(photo, CREW_BUCKET)))
        update((d) => ({ ...d, posts: d.posts.filter((x) => x.id !== p.id) }))
      }
      if (p.kind === 'qotd') { // deleting the answer brings the question back
        const when = new Date(p.ts), day = `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, '0')}-${String(when.getDate()).padStart(2, '0')}`
        update((d) => ({ ...d, qotd: Object.fromEntries(Object.entries(d.qotd).filter(([k]) => k !== day && !k.endsWith(`|${day}`))) }))
      }
      if (p.kind === 'workout' && p.mine) { // deleting it lets you share today's workout again
        const when = new Date(p.ts), day = `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, '0')}-${String(when.getDate()).padStart(2, '0')}`
        const key = p.crewId === data.primary ? day : `${day}|${p.crewId}`
        update((d) => ({ ...d, workoutPosted: Object.fromEntries(Object.entries(d.workoutPosted ?? {}).filter(([k]) => k !== key)) }))
      }
      feed?.refresh(); setDel(null)
    } catch (error) { setDel(null); setErr(error instanceof Error ? error.message : String(error)) }
  }

  return (
    <>
      {err && <p role="alert" className="err small">{err}</p>}
      {posts.length === 0 && <section className="feed-empty"><span className="icon-surface"><Icon name="weight" /></span><h3>No posts yet.</h3><p>Post a workout, ask a question,<br />or let your crew know you’re coming.</p></section>}
      {posts.map((p) => {
        const clip = postVideo(p.meta)
        const all = postPhotos(p)
        // with a clip, the post's first picture is its cover frame (when it has one); the rest are the photos beside it
        const hasCover = !!clip && (clip.cover ?? all.length > 0)
        const cover = hasCover && all[0] ? urls[all[0].id] : undefined
        const images = all.slice(hasCover ? 1 : 0).map((photo) => urls[photo.id]).filter(Boolean)
        const meta = p.meta as { sets?: number; volume?: number; exercises?: number; q?: string } | undefined
        return (
          <article key={p.id} className="card post">
            <div className="row">
              <div className="person"><Avatar name={p.name} url={p.mine ? avatarUrl : p.userId ? crewAvatars[p.userId] : null} /><div><b>{p.name.split(' ')[0]}{p.mine ? ' (you)' : ''}</b><div className="small mute">{timeAgo(p.ts)}</div></div></div>
              {p.kind === 'qotd' && <span className="tag accent">Question of the day</span>}
              {p.kind === 'workout' && <span className="tag ok">Workout</span>}
            </div>
            {p.kind === 'qotd' && meta?.q && <div className="small mute">“{meta.q}”</div>}
            {p.text && <p style={{ whiteSpace: 'pre-wrap' }}>{p.text}</p>}
            {p.kind === 'workout' && meta && (
              <div className="grid3">
                <div className="stat"><b>{meta.exercises ?? 0}</b><span>exercises</span></div>
                <div className="stat"><b>{meta.sets ?? 0}</b><span>sets</span></div>
                <div className="stat"><b>{meta.volume ? `${Math.round(meta.volume / 100) / 10}k` : '—'}</b><span>lb lifted</span></div>
              </div>
            )}
            {clip
              ? (images.length === 0
                ? <PostVideo video={clip} cover={cover} ts={p.ts} />
                : <PostPhotos srcs={images} onOpen={(start) => setBig({ srcs: images, start })} lead={<PostVideo tile video={clip} cover={cover} ts={p.ts} hold={!!watch} onOpen={() => setWatch({ video: clip, cover })} />} />)
              : images.length > 0 && <PostPhotos srcs={images} onOpen={(start) => setBig({ srcs: images, start })} />}
            <div className="row">
              <div className="post-like-group">
                <button className={`post-like ${p.liked ? 'on' : ''}`} aria-label={p.liked ? 'Unlike post' : 'Like post'} aria-pressed={p.liked} onClick={() => like(p)}><Icon name="heart" size={20} /></button>
                {p.likes > 0 && (userId
                  ? <button className="post-like-count" onClick={() => showLikers(p)} aria-label={`See who liked this post, ${p.likes} ${p.likes === 1 ? 'like' : 'likes'}`}>{p.likes} {p.likes === 1 ? 'like' : 'likes'}</button>
                  : <span className="post-like-count">{p.likes}</span>)}
              </div>
              {p.mine && <button className="link-danger" onClick={() => setDel(p)}>Delete</button>}
            </div>
            {userId && <CommentThread postId={p.id} count={p.comments} me={{ id: userId }} postMine={p.mine} />}
          </article>
        )
      })}
      {likers && <LikersSheet title={likers.title} people={likers.people} onClose={() => setLikers(null)} />}
      {big && <Lightbox srcs={big.srcs} start={big.start} onClose={() => setBig(null)} />}
      {watch && <VideoViewer video={watch.video} cover={watch.cover} onClose={() => setWatch(null)} />}
      {del && <ConfirmSheet title="Delete this post?" message="Are you sure you want to delete this post? It will be removed for everyone in the crew." confirmLabel="Yes, delete it" onConfirm={() => void remove(del)} onCancel={() => setDel(null)} />}
    </>
  )
}

/** Photos side by side like Strava: one fills the post, two share it, three fit across, and more scroll sideways. */
function PostPhotos({ srcs, onOpen, lead }: { srcs: string[]; onOpen: (i: number) => void; lead?: ReactNode }) {
  const total = srcs.length + (lead ? 1 : 0)
  const what = lead ? `A video and ${srcs.length} photo${srcs.length === 1 ? '' : 's'}` : `${srcs.length} photo${srcs.length === 1 ? '' : 's'}`
  return <div className="post-strip" data-count={Math.min(total, 4)} role="list" aria-label={`${what}${total > 3 ? ', swipe to see more' : ''}`}>
    {lead && <div className="post-strip-item post-strip-video" role="listitem">{lead}</div>}
    {srcs.map((src, i) => <button className="post-strip-item" role="listitem" key={src} aria-label={`Open photo ${i + 1} of ${srcs.length}`} onClick={() => onOpen(i)}><img src={src} alt={`Post photo ${i + 1}`} loading="lazy" /></button>)}
  </div>
}

let nowPlaying: HTMLVideoElement | null = null // only one clip in the feed plays at a time

// Every clip that is mostly on screen right now. Only the one nearest the middle of the screen plays; when it scrolls away
// (or another gets nearer) the next one takes over.
interface Slot { box: HTMLElement; start: () => void; stop: () => void }
const onScreen = new Set<Slot>()
let chooseFrame = 0
function choosePlayer() {
  chooseFrame = 0
  let best: Slot | null = null, bestGap = Infinity
  for (const s of onScreen) { const r = s.box.getBoundingClientRect(); const gap = Math.abs(r.top + r.height / 2 - window.innerHeight / 2); if (gap < bestGap) { best = s; bestGap = gap } }
  for (const s of onScreen) { if (s === best) s.start(); else s.stop() }
}
const scheduleChoose = () => { if (!chooseFrame) chooseFrame = requestAnimationFrame(choosePlayer) }
if (typeof window !== 'undefined') window.addEventListener('scroll', () => { if (onScreen.size > 1) scheduleChoose() }, { passive: true })

/**
 * A clip in the feed. It starts by itself, without sound, once more than half of it is on screen, loops, and pauses when
 * you scroll away. Tap it for sound and controls. The clip only downloads when it is the one about to play. If the phone
 * won't start it alone (Low Power Mode, data saver, reduced motion) the cover shows a play button instead.
 * As `tile` it is one square in the photo strip: it plays muted in place and tapping it opens the clip full screen.
 */
function PostVideo({ video, cover, ts, tile = false, hold = false, onOpen }: { video: VideoMeta; cover?: string; ts: number; tile?: boolean; hold?: boolean; onOpen?: () => void }) {
  const length = video.seconds ? clock(video.seconds) : ''
  const left = videoDaysLeft(ts)
  const expired = !!video.expired || left <= 0 // videos are deleted after 60 days; the post and its cover stay
  const soon = !expired && left <= 7
  const note = soon && !tile ? <p className="small mute post-video-left">Video expires in {left} day{left === 1 ? '' : 's'}</p> : null
  const soonBadge = soon && tile ? <span className="post-video-soon">{left}d left</span> : null
  const box = useRef<HTMLDivElement>(null)
  const el = useRef<HTMLVideoElement>(null)
  const visible = useRef(false)
  const loading = useRef(false)
  const made = useRef<string | null>(null)
  const [src, setSrc] = useState<string | null>(null)
  const srcNow = useRef<string | null>(null); srcNow.current = src
  const [err, setErr] = useState('')
  const [blocked, setBlocked] = useState(false) // the phone wouldn't start it without a tap
  const [engaged, setEngaged] = useState(false) // they tapped: sound on
  const [controls, setControls] = useState(false) // native controls, shown just after the tap so that same tap doesn't also hit their pause button
  const auto = useMemo(() => {
    const saver = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData
    return typeof IntersectionObserver !== 'undefined' && !saver && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  }, [])

  const load = async () => {
    if (loading.current || srcNow.current) return
    loading.current = true; setErr('')
    try {
      const url = await videoUrl(video)
      if (!url) throw new Error('This video isn\u2019t available right now.')
      if (url.startsWith('blob:')) made.current = url
      setSrc(url)
    } catch (error) { setErr(error instanceof Error ? error.message : String(error)) } finally { loading.current = false }
  }
  const start = async () => {
    const v = el.current
    if (!v) return
    if (nowPlaying && nowPlaying !== v) nowPlaying.pause()
    nowPlaying = v
    try { await v.play(); setBlocked(false) } catch (error) {
      if ((error as DOMException)?.name === 'AbortError') return // something else paused it a moment later; that is not the phone refusing
      if (!v.muted) { v.muted = true; setEngaged(false); try { await v.play(); setBlocked(false); return } catch { /* still not allowed */ } }
      setBlocked(true)
    }
  }
  const slot = useRef<Slot | null>(null)
  slot.current = { box: box.current as HTMLElement, start: () => { if (srcNow.current) void start(); else void load() }, stop: () => el.current?.pause() }
  useEffect(() => () => {
    if (made.current) URL.revokeObjectURL(made.current)
    if (el.current && nowPlaying === el.current) nowPlaying = null
  }, [])

  // join the clips on screen once more than half of it shows, leave when it is mostly gone
  useEffect(() => {
    const box_ = box.current
    if (!auto || !box_ || expired) return
    const mine = { box: box_, start: () => slot.current?.start(), stop: () => slot.current?.stop() }
    const io = new IntersectionObserver(([e]) => {
      if (e.intersectionRatio >= 0.6) { visible.current = true; onScreen.add(mine); scheduleChoose() }
      else if (e.intersectionRatio < 0.25) { visible.current = false; onScreen.delete(mine); el.current?.pause(); scheduleChoose() }
    }, { threshold: [0, 0.25, 0.6, 1] })
    io.observe(box_)
    return () => { io.disconnect(); onScreen.delete(mine); scheduleChoose() }
  }, [auto, expired])
  // while the clip is open full screen, the little one waits
  useEffect(() => { if (hold) el.current?.pause(); else if (tile) scheduleChoose() }, [hold]) // eslint-disable-line react-hooks/exhaustive-deps

  const tapCover = () => { setEngaged(true); setControls(true); visible.current = true; void load() }
  const tapVideo = () => { const v = el.current; if (!v) return; if (blocked) { void start(); return } if (!engaged) { v.muted = false; setEngaged(true); void start(); window.setTimeout(() => setControls(true), 200) } }

  if (tile) { // one square in the photo strip: plays muted in place, tapping it opens the clip full screen
    if (expired) {
      return (
        <div className="post-video-tile" role="img" aria-label="Video expired">
          {cover ? <img src={cover} alt="" loading="lazy" className="post-video-dim" /> : <span className="post-video-tile-blank" />}
          <span className="post-video-gone-tile"><Icon name="video" size={22} />Expired</span>
        </div>
      )
    }
    const open = () => { el.current?.pause(); onOpen?.() }
    return (
      <div ref={box} className="post-video-tile">
        {src
          ? <video ref={el} className="post-video-tile-video" src={src} poster={cover} muted loop playsInline preload="auto" aria-label={length ? `Video, ${length}. Tap to watch with sound.` : 'Video. Tap to watch with sound.'}
              onCanPlay={() => { if (!hold) scheduleChoose() }} onClick={open}
              onError={() => { setSrc(null); setErr('This device can\u2019t play that video.') }} />
          : <button className="post-video-tile-open" aria-label={length ? `Play video, ${length}` : 'Play video'} onClick={open}>
              {cover ? <img src={cover} alt="" loading="lazy" /> : <span className="post-video-tile-blank" />}
              <span className="post-video-play"><Icon name="play" size={22} /></span>
            </button>}
        {blocked && <button className="post-video-play post-video-play-over" aria-label="Play video" onClick={open}><Icon name="play" size={22} /></button>}
        {length && <span className="post-video-time">{length}</span>}
        {soonBadge}
      </div>
    )
  }
  if (expired) {
    return (
      <div className="post-video-cover post-video-expired" role="img" aria-label={`Video expired. Videos are kept for ${KEEP_VIDEO_DAYS} days.`}>
        {cover ? <img src={cover} alt="" loading="lazy" /> : <span className="post-video-blank" />}
        <span className="post-video-gone"><Icon name="video" size={26} />Video expired<small>Videos are kept for {KEEP_VIDEO_DAYS} days</small></span>
      </div>
    )
  }
  if (!src) {
    return (
      <div ref={box}>
        <button className="post-video-cover" aria-label={length ? `Play video, ${length}` : 'Play video'} onClick={tapCover}>
          {cover ? <img src={cover} alt="" loading="lazy" /> : <span className="post-video-blank" />}
          <span className="post-video-play"><Icon name="play" size={26} /></span>
          {length && <span className="post-video-time">{length}</span>}
        </button>
        {err && <p className="small err" role="alert">{err}</p>}
        {note}
      </div>
    )
  }
  return (
    <div ref={box} className="post-video-wrap">
      <video ref={el} className="post-video" src={src} poster={cover} muted={!engaged} loop playsInline preload="auto" controls={controls && !blocked}
        onCanPlay={() => { if (engaged) void start(); else scheduleChoose() }} onClick={tapVideo}
        onError={() => { setSrc(null); setErr('This device can\u2019t play that video.') }} />
      {blocked && <button className="post-video-play post-video-play-over" aria-label="Play video" onClick={() => void start()}><Icon name="play" size={26} /></button>}
      {!engaged && !blocked && <span className="post-video-hint" aria-hidden="true">Tap for sound</span>}
      {note}
    </div>
  )
}

/** A clip open full screen, with sound and controls. Tap outside it, press Escape or use the cross to close. */
function VideoViewer({ video, cover, onClose }: { video: VideoMeta; cover?: string; onClose: () => void }) {
  const [src, setSrc] = useState<string | null>(null)
  const [err, setErr] = useState('')
  useEffect(() => {
    let alive = true, made: string | null = null
    void (async () => {
      try {
        const url = await videoUrl(video)
        if (!url) throw new Error('This video isn\u2019t available right now.')
        if (url.startsWith('blob:')) made = url
        if (alive) setSrc(url)
      } catch (error) { if (alive) setErr(error instanceof Error ? error.message : String(error)) }
    })()
    return () => { alive = false; if (made) URL.revokeObjectURL(made) }
  }, [video])
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', key)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', key); document.body.style.overflow = overflow }
  }, [onClose])
  return (
    <div className="video-viewer" role="dialog" aria-modal="true" aria-label="Video" onClick={onClose}>
      {src
        ? <video src={src} poster={cover} controls autoPlay playsInline onClick={(e) => e.stopPropagation()}
            onCanPlay={(e) => { const v = e.currentTarget; if (v.paused) void v.play().catch(() => { v.muted = true; void v.play().catch(() => undefined) }) }} // some phones only allow a silent start
            onError={() => setErr('This device can\u2019t play that video.')} />
        : <p className="small mute">{err || 'Loading…'}</p>}
      {src && err && <p className="small err video-viewer-err" role="alert">{err}</p>}
      <button className="video-viewer-close" aria-label="Close video" onClick={(e) => { e.stopPropagation(); onClose() }}><Icon name="close" size={20} /></button>
    </div>
  )
}
