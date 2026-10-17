import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../store'
import { Avatar, ConfirmSheet, Lightbox, Sheet } from '../components'
import { PostTo, useMyCrews, type MyCrew } from '../CrewPicker'
import { BodyIcon } from '../BodyIcon'
import { CommentsPanel } from '../Comments'
import { LikersList, type LikerRow } from '../Likers'
import { DoneSheet } from '../WorkoutShare'
import { summaryFromLog } from '../shareCard'
import { WorkoutCard } from '../WorkoutCard'
import { postedKey, readWorkoutPost, shareableLogs, workoutPost } from '../workoutPost'
import { postWhen } from '../postWhen'
import { announceFeedChanged, createPostCloud, deletePostCloud, ensureMemberCloud, fetchPostLikers, reportPostCloud, toggleLikeCloud, useCrewFeed, useFeedAvatars, useHomeFeed, type FeedTab } from '../cloud'
import { CREW_BUCKET, postPhotos, postVideo, compress, deletePhotoBlob, savePhotoBlob, saveVideoBlob, usePhotoUrls, videoUrl } from '../photos'
import { KEEP_VIDEO_DAYS, MAX_PHOTOS, MAX_PHOTOS_WITH_VIDEO, clock, prepareVideo, videoDaysLeft, type PreparedVideo } from '../videos'
import { Icon } from '../icons'
import { fromISO, iso, todayISO, workoutName } from '../engine'
import type { CrewPost, PostKind, VideoMeta, WorkoutLog } from '../types'

/** Create posts in a crew's feed (cloud when connected, on-device otherwise). */
export function usePostActions(crewId: string) {
  const { data, update, userId } = useApp()
  const feed = useCrewFeed(crewId, userId)
  const name = data.name || 'Member'
  /** `to` sends it to a different crew than the one this was opened for (a person in several crews picks where it goes). */
  const post = async (p: { kind: PostKind; text: string; photos?: Blob[]; video?: PreparedVideo; meta?: Record<string, unknown>; progress?: (text: string) => void; to?: string }): Promise<string | null> => {
    const target = p.to ?? crewId
    const imagePaths: string[] = [], imageIds: string[] = []
    const uploaded: { id: string; path?: string }[] = []
    let meta = p.meta
    try {
      if ((p.photos?.length ?? 0) > MAX_PHOTOS) throw new Error(`Choose up to ${MAX_PHOTOS} photos.`)
      if (p.video && (p.photos?.length ?? 0) > MAX_PHOTOS_WITH_VIDEO) throw new Error(`Choose up to ${MAX_PHOTOS_WITH_VIDEO} photos with a video.`)
      if (userId) {
        p.progress?.('Confirming membership…')
        const m = await ensureMemberCloud(target, userId, name)
        if (m) throw new Error(`Couldn’t confirm your crew membership: ${m}`)
      }
      if (p.video) { // the clip goes up first; its still frame is saved like a photo, ahead of the post's own photos, and becomes the cover
        const size = `${Math.max(1, Math.round(p.video.file.size / 1048576))} MB`
        p.progress?.(`Uploading video (${size})…`)
        const vid = crypto.randomUUID()
        const r = await saveVideoBlob(vid, p.video.file, p.video.type, userId, userId ? `${target}/${userId}` : '', (pct) => p.progress?.(`Uploading video ${pct}% of ${size}`))
        uploaded.push({ id: vid, path: r.path })
        const clip: VideoMeta = { ...(r.path ? { path: r.path } : { id: vid }), type: p.video.type, seconds: p.video.seconds, size: p.video.file.size, cover: !!p.video.poster }
        meta = { ...meta, video: clip }
      }
      const stills = [...(p.video?.poster ? [p.video.poster] : []), ...(p.photos ?? [])]
      for (const [i, photo] of stills.entries()) {
        p.progress?.(p.video && !p.photos?.length ? 'Finishing…' : `Uploading ${i + 1} of ${stills.length}`)
        const small = await compress(photo)
        const id = crypto.randomUUID()
        const r = await savePhotoBlob(id, small, userId, CREW_BUCKET, userId ? `${target}/${userId}` : '')
        uploaded.push({ id, path: r.path })
        if (userId) {
          if (!r.path) throw new Error(r.error || 'Photo upload failed.')
          imagePaths.push(r.path)
        } else imageIds.push(id)
      }
      p.progress?.('Posting…')
      if (userId) {
        const error = await createPostCloud({ crewId: target, userId, name, kind: p.kind, text: p.text, imagePaths, meta, isPublic: !!data.profilePublic })
        if (error) throw new Error(error)
        if (target === crewId) feed?.refresh(); else announceFeedChanged()
      } else {
        const local: CrewPost = { id: crypto.randomUUID(), crewId: target, name, kind: p.kind, text: p.text, imagePaths, imageIds, meta, ts: Date.now(), mine: true, likes: 0, liked: false }
        update((d) => ({ ...d, posts: [local, ...d.posts] }))
      }
      return null
    } catch (error) {
      // Remove earlier photos if a later upload or the row insert fails.
      await Promise.allSettled(uploaded.map((p) => deletePhotoBlob(p, CREW_BUCKET)))
      return error instanceof Error ? error.message : String(error)
    }
  }
  /** Posts the same thing to several crews, one after another. Says which went through and which did not. */
  const postTo = async (ids: string[], p: Omit<Parameters<typeof post>[0], 'to'>) => {
    const ok: string[] = [], errors: { id: string; error: string }[] = []
    for (const id of ids) {
      const error = await post({ ...p, to: id })
      if (error) errors.push({ id, error }); else ok.push(id)
    }
    return { ok, errors }
  }
  return { post, postTo, feed }
}

/** Says what to tell the person after posting to several crews. Null when everything went through. */
export function sendReport(crews: MyCrew[], ok: string[], errors: { id: string; error: string }[]): string | null {
  if (!errors.length) return null
  if (crews.length < 2) return errors[0].error
  const names = (ids: string[]) => ids.map((id) => crews.find((c) => c.id === id)?.name ?? 'a crew').join(' and ')
  return `${ok.length ? `Posted to ${names(ok)}. ` : ''}Couldn’t post to ${names(errors.map((e) => e.id))}: ${errors[0].error}`
}

/** Sharing workouts with crews: which crews already have a given day's workout, and posting one to the crews you pick. */
export function useWorkoutSharing() {
  const { data, update } = useApp()
  const crews = useMyCrews()
  const { postTo } = usePostActions('')
  /** The crews that already have the workout from this day. */
  const posted = (date: string) => crews.filter((c) => data.workoutPosted?.[postedKey(date, c.id, data.primary)]).map((c) => c.id)
  /** Posts a workout (from today or any earlier day) to the chosen crews, with a picture if there is one. Returns an error message, or null. */
  const share = async (log: WorkoutLog, ids: string[], blob?: Blob, place?: string, caption?: string, more?: { photos?: Blob[]; video?: PreparedVideo; cardAt?: number; progress?: (text: string) => void }): Promise<string | null> => {
    const done = posted(log.date)
    const todo = ids.filter((id) => !done.includes(id))
    if (!todo.length) return 'That workout is already shared with this crew.'
    const sum = summaryFromLog(data, log)
    const wp = sum
      ? workoutPost(sum, log.entries, log.dayType, data.settings.shareLifts !== false, { at: log.finishedAt, place, caption })
      : { text: `Finished ${log.dayType}${log.minutes ? ` in ${log.minutes} min` : ''}`, meta: { sets: log.entries.reduce((a, e) => a + e.sets.length, 0), exercises: log.entries.length } as Record<string, unknown> }
    // the workout picture goes first (it is locked to the front unless they slid it back), with the video, then their photos, around it
    const extras: ('video' | Blob)[] = [...(more?.video ? ['video' as const] : []), ...(more?.photos ?? [])]
    const order: ('video' | 'card' | Blob)[] = [...extras]
    order.splice(Math.min(Math.max(0, more?.cardAt ?? 0), extras.length), 0, 'card')
    const photos = order.flatMap((x) => (x === 'video' ? [] : x === 'card' ? (blob ? [blob] : []) : [x]))
    const videoAt = order.indexOf('video') // where the clip sits among the pictures; older posts have none and lead with it
    const meta = videoAt > 0 ? { ...wp.meta, videoAt } : wp.meta
    const { ok, errors } = await postTo(todo, { kind: 'workout', text: wp.text, meta, photos: photos.length ? photos : undefined, video: more?.video, progress: more?.progress })
    if (ok.length) {
      update((d) => ({ ...d, workoutPosted: { ...d.workoutPosted, ...Object.fromEntries(ok.map((id) => [postedKey(log.date, id, d.primary), true])) } }))
      announceFeedChanged()
    }
    return sendReport(crews, ok, errors)
  }
  return { crews, posted, share }
}

/** The share screen for one finished workout, today's or an earlier one: pick the crews, add a picture, post. Or send it to Instagram. */
export function ShareWorkoutSheet({ log, viewing, onClose }: { log: WorkoutLog; viewing?: string; onClose: () => void }) {
  const { data, update } = useApp()
  const { crews, posted, share } = useWorkoutSharing()
  const summary = summaryFromLog(data, log)
  if (!summary) return null
  const crewPost = crews.length ? { crews, done: posted(log.date), defaultTo: viewing ?? data.primary ?? crews[0].id, onPost: (blob: Blob, ids: string[], opts?: { place?: string; caption?: string; photos?: File[]; video?: PreparedVideo; cardAt?: number; progress?: (text: string) => void }) => share(log, ids, blob, opts?.place, opts?.caption, opts) } : undefined
  return <DoneSheet summary={summary} settings={data.settings} onPrefs={(patch) => update((d) => ({ ...d, settings: { ...d.settings, ...patch } }))} onClose={onClose} crewPost={crewPost} />
}

/** Pick which finished workout to share: today's, or any earlier one. */
function WorkoutPicker({ onPick, onClose }: { onPick: (log: WorkoutLog) => void; onClose: () => void }) {
  const { data } = useApp()
  const { crews, posted } = useWorkoutSharing()
  const logs = shareableLogs(data.logs)
  const today = todayISO()
  const [shown, setShown] = useState(8)
  return (
    <Sheet title="Share a workout" onClose={onClose}>
      <p className="small mute">Pick the workout to share. Anything you have finished is here, not just today.</p>
      <div className="pick-workouts">
        {logs.slice(0, shown).map((l) => {
          const done = posted(l.date)
          const all = crews.length > 0 && done.length === crews.length
          const title = workoutName(l.dayType, data.workoutFocus?.[l.date])
          return <button key={l.date} type="button" className="minirow" onClick={() => onPick(l)}>
            <span className="pick-icon"><BodyIcon name={title} size={26} /></span>
            <span style={{ flex: 1, textAlign: 'left' }}><b>{title}</b><br /><span className="small mute">{l.date === today ? 'Today' : fromISO(l.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} · {l.entries.reduce((a, e) => a + e.sets.length, 0)} sets{l.minutes ? ` · ${l.minutes} min` : ''}</span></span>
            {done.length > 0 && <span className={`tag ${all ? 'ok' : ''}`}>{all ? '✓ Shared' : `✓ ${done.length} of ${crews.length}`}</span>}
          </button>
        })}
      </div>
      {logs.length > shown && <button type="button" className="ghost" onClick={() => setShown(shown + 8)}>Show more</button>}
    </Sheet>
  )
}

/** The "share something" box. It sits at the top of the crew page; the posts below it live in Feed. */
export function FeedComposer({ crewId }: { crewId: string }) {
  const { data, update } = useApp()
  const crews = useMyCrews()
  const { postTo } = usePostActions(crewId)
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
  const logs = shareableLogs(data.logs)
  const [picking, setPicking] = useState(false)
  const [sharing, setSharing] = useState<WorkoutLog | null>(null)
  // where it goes: the crew you are looking at, unless you pick others (you can be in up to three)
  const [to, setTo] = useState<string[] | null>(null)
  const targets = (to ?? [crewId]).filter((id) => crews.some((c) => c.id === id))
  const goingTo = targets.length ? targets : [crewId]
  const [note, setNote] = useState('')

  /** Posts the box's text and photos to the chosen crews. */
  const submit = async () => {
    if (posting.current) return
    const clip = video ?? undefined
    const body = { kind: (clip ? 'video' : photos.length ? 'photo' : 'post') as PostKind, text: text.trim() }
    if (!body.text && !photos.length && !clip) return
    posting.current = true; setBusy(true); setErr(''); setNote(''); setProgress('Posting…')
    try {
      const { ok, errors } = await postTo(goingTo, { ...body, photos, video: clip, progress: setProgress })
      const report = sendReport(crews, ok, errors)
      if (ok.length) announceFeedChanged()
      if (report) { setErr(report); setTo(errors.map((e) => e.id)); return } // keep what they wrote, and aim it at the crews that missed out
      setText(''); setPhotos([]); setVideo(null); setTo(null)
      if (crews.length > 1) { setNote(`Posted to ${ok.map((id) => crews.find((c) => c.id === id)?.name ?? 'your crew').join(' and ')}.`); setTimeout(() => setNote(''), 5000) }
    } catch (error) { setErr(error instanceof Error ? error.message : String(error)) }
    finally { posting.current = false; setBusy(false) }
  }

  return (
    <>
      <section className="card feed-composer">
        <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder={crews.length > 1 ? 'Share something with your crews...' : 'Share something with your crew...'} maxLength={1000} />
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
        <PostTo crews={crews} value={goingTo} onChange={setTo} disabled={busy} />
        <div className="row wrap composer-actions">
          <button className="ghost small-btn" disabled={busy || photos.length >= (video ? MAX_PHOTOS_WITH_VIDEO : MAX_PHOTOS)} onClick={() => file.current?.click()}><Icon name="photo" size={18} /> Add photos</button>
          <button className="ghost small-btn" disabled={busy || checking || !!video} onClick={() => videoFile.current?.click()}><Icon name="video" size={18} />{checking ? 'Checking…' : 'Add video'}</button>
          {logs.length > 0 && <button className="ghost small-btn" onClick={() => logs.length === 1 ? setSharing(logs[0]) : setPicking(true)} disabled={busy}><Icon name="weight" size={18} />Share workout</button>}
          <span style={{ flex: 1 }} />
          <button className="primary small-btn" onClick={() => void submit()} disabled={busy || checking || (!text.trim() && !photos.length && !video)}>{busy ? progress : 'Post'}</button>
        </div>
        {busy && <p className="small mute" role="status">{progress}</p>}
        {err && <p role="alert" className="err small">{err}</p>}
        {note && <p className="small ok-text" role="status">{note}</p>}
      </section>
      {picking && <WorkoutPicker onClose={() => setPicking(false)} onPick={(l) => { setPicking(false); setSharing(l) }} />}
      {sharing && <ShareWorkoutSheet log={sharing} viewing={crewId} onClose={() => setSharing(null)} />}
    </>
  )
}

/** A post as the feed shows it: the same thing posted to several crews is one card, marked with each crew. */
export type FeedPost = CrewPost & { crews: string[] }

/** Folds the copies of one post (same person, same content, minutes apart) that went to different crews into one card. */
export function groupPosts(posts: CrewPost[]): FeedPost[] {
  const out: FeedPost[] = [], seen = new Map<string, FeedPost[]>()
  for (const p of [...posts].sort((a, b) => b.ts - a.ts)) {
    const m = (p.meta ?? {}) as Record<string, unknown>
    const sig = `${p.userId ?? (p.mine ? 'me' : p.name)}|${p.kind}|${p.text}|${m.at ?? ''}|${m.date ?? ''}|${m.q ?? ''}|${p.imagePaths.length}`
    const twin = (seen.get(sig) ?? []).find((x) => Math.abs(x.ts - p.ts) < 10 * 60000)
    if (twin) { if (!twin.crews.includes(p.crewId)) twin.crews.push(p.crewId); continue }
    const card: FeedPost = { ...p, crews: [p.crewId] }
    out.push(card); seen.set(sig, [...(seen.get(sig) ?? []), card])
  }
  return out
}

/**
 * The Home feed. Explore is the public posts of everyone on Will Power (a few from each person); My crews is your crews' posts;
 * Following is the public posts of people you follow. Needs no crew to read; with none it says how to get started.
 */
export function HomeFeed() {
  const { data, userId, update } = useApp()
  const crews = useMyCrews()
  const crewIds = crews.map((c) => c.id)
  const [tab, setTabState] = useState<FeedTab>(() => { try { const v = localStorage.getItem('wpf.feedTab'); return v === 'crews' || v === 'following' ? v : 'explore' } catch { return 'explore' } })
  const setTab = (t: FeedTab) => { setTabState(t); try { localStorage.setItem('wpf.feedTab', t) } catch { /* private mode */ } }
  const feed = useHomeFeed(crewIds, userId, tab)
  // on this device (no account online) there is only your crews' posts
  const raw = feed ? feed.posts : tab === 'following' ? [] : data.posts.filter((p) => crewIds.includes(p.crewId))
  const posts = useMemo(() => {
    const all = groupPosts(raw)
    if (tab !== 'explore') return all
    // Explore mixes in lots of people: at most two posts from each, newest first, so nobody fills the page
    const seen = new Map<string, number>()
    return all.filter((p) => { const k = p.userId ?? p.name, n = (seen.get(k) ?? 0) + 1; seen.set(k, n); return n <= 2 }).slice(0, 60)
  }, [raw, tab])
  const avatars = useFeedAvatars(posts.map((p) => p.userId ?? ''), crewIds)
  const tabs: [FeedTab, string][] = [['explore', 'Explore'], ['crews', 'My crews'], ['following', 'Following']]
  return <>
    {data.publicNotice && <section className="card public-notice" role="status">
      <b>Your profile is now public</b>
      <p className="small mute">Your new posts show in Explore for everyone on Will Power. Older posts stay with your crews. You can switch this off anytime in Settings.</p>
      <div className="row wrap"><Link to="/settings" className="btn ghost small-btn">Settings</Link><span style={{ flex: 1 }} /><button type="button" className="primary small-btn" onClick={() => update((d) => ({ ...d, publicNotice: false }))}>OK</button></div>
    </section>}
    {feed && <div className="feed-tabs" role="group" aria-label="Which feed">{tabs.map(([id, label]) => <button key={id} type="button" className={tab === id ? 'on' : ''} aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</button>)}</div>}
    <PostList posts={posts} refresh={feed?.refresh} avatars={avatars} crews={crews} tab={tab} />
  </>
}

/** The posts themselves: cards with likes, comments, photos and video. Used by the Home feed. */
function PostList({ posts, refresh, avatars, crews, tab }: { posts: FeedPost[]; refresh?: () => void; avatars: Record<string, string>; crews: MyCrew[]; tab: FeedTab }) {
  const { data, update, userId, avatarUrl } = useApp()
  const [err, setErr] = useState('')
  const [del, setDel] = useState<CrewPost | null>(null)
  const [reporting, setReporting] = useState<CrewPost | null>(null)
  const [note, setNote] = useState('')
  const [big, setBig] = useState<{ srcs: string[]; start: number } | null>(null)
  const [watch, setWatch] = useState<{ video: VideoMeta; cover?: string } | null>(null) // a clip open full screen
  const urls = usePhotoUrls(posts.flatMap(postPhotos), CREW_BUCKET)
  // say which crew a post is in when there is more than one place it could be from
  const crewLine = (p: FeedPost) => {
    // a crew you are not in is shown as "Following" in that feed, and not at all in Explore (they are just people on the app)
    const names = p.crews.map((id) => crews.find((c) => c.id === id)?.name ?? (tab === 'explore' ? '' : 'Following')).filter(Boolean)
    return crews.length > 1 || names.includes('Following') ? [...new Set(names)].join(' · ') : ''
  }

  const [activity, setActivity] = useState<{ post: FeedPost; tab: 'likes' | 'comments' } | null>(null) // the popup: who liked it, and the comments
  const like = (p: CrewPost) => {
    if (userId) { void toggleLikeCloud(p.id, userId, p.liked).then(() => refresh?.()); return }
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
      if (p.kind === 'workout' && p.mine) { // deleting it lets you share that workout with this crew again
        const day = readWorkoutPost(p).date ?? iso(new Date(p.ts))
        const key = postedKey(day, p.crewId, data.primary)
        update((d) => ({ ...d, workoutPosted: Object.fromEntries(Object.entries(d.workoutPosted ?? {}).filter(([k]) => k !== key)) }))
      }
      refresh?.(); setDel(null)
    } catch (error) { setDel(null); setErr(error instanceof Error ? error.message : String(error)) }
  }

  return (
    <>
      {err && <p role="alert" className="err small">{err}</p>}
      {note && <p className="small ok-text" role="status">{note}</p>}
      {posts.length === 0 && (tab === 'explore' && userId
        ? <section className="feed-empty"><span className="icon-surface"><Icon name="search" /></span><h3>Nothing to explore yet.</h3><p>Public posts from everyone on Will Power<br />show up here. Be the first to post.</p></section>
        : tab === 'following'
        ? <section className="feed-empty"><span className="icon-surface"><Icon name="person" /></span><h3>Nobody to show yet.</h3><p>Follow friends and their workouts<br />show up here.</p><Link to="/friends" className="btn primary">Find friends</Link></section>
        : crews.length === 0
        ? <section className="feed-empty"><span className="icon-surface"><Icon name="crew" /></span><h3>Your feed starts with a crew.</h3><p>Join a crew, or follow friends,<br />and their workouts show up here.</p><Link to="/crew" className="btn primary">Find a crew</Link></section>
        : <section className="feed-empty"><span className="icon-surface"><Icon name="weight" /></span><h3>No posts yet.</h3><p>Post a workout, ask a question,<br />or let your crew know you’re coming.</p></section>)}
      {posts.map((p) => {
        const clip = postVideo(p.meta)
        const all = postPhotos(p)
        // with a clip, the post's first picture is its cover frame (when it has one); the rest are the photos beside it
        const hasCover = !!clip && (clip.cover ?? all.length > 0)
        const cover = hasCover && all[0] ? urls[all[0].id] : undefined
        const images = all.slice(hasCover ? 1 : 0).map((photo) => urls[photo.id]).filter(Boolean)
        const meta = p.meta as { q?: string } | undefined
        const wk = p.kind === 'workout' ? readWorkoutPost(p) : null
        const when = postWhen(p)
        // a post with a picture or clip is just that, like any social feed: the picture says it all (a workout card is already a
        // picture of the numbers), and the words go under it as a caption. Without one, the text or workout card is the post.
        const hasMedia = !!clip || all.length > 0
        const caption = hasMedia ? (wk ? wk.caption : p.text) : ''
        return (
          <article key={p.id} className={`card post${wk && !hasMedia ? ' wk' : ''}${hasMedia ? ' has-media' : ''}`}>
            <div className="row">
              <div className="person"><Avatar name={p.name} url={p.mine ? avatarUrl : p.userId ? avatars[p.userId] : null} /><div><b>{p.name.split(' ')[0]}{p.mine ? ' (you)' : ''}</b><div className="small mute post-when">{wk && hasMedia && <><BodyIcon name={wk.title} size={14} />{' '}</>}{when.text}{when.place && <> · <span className="post-place" title="Where they trained">{when.place}</span></>}</div>{crewLine(p) && <div className="small mute post-crew">{crewLine(p)}</div>}</div></div>
              {p.kind === 'qotd' && <span className="tag accent">Question of the day</span>}
              {wk && !hasMedia && <span className="wk-chip">{wk.chip}</span>}
            </div>
            {p.kind === 'qotd' && meta?.q && <div className="small mute">“{meta.q}”</div>}
            {!hasMedia && (wk ? <WorkoutCard w={wk} /> : p.text && <p style={{ whiteSpace: 'pre-wrap' }}>{p.text}</p>)}
            {clip
              ? (images.length === 0
                ? <PostVideo video={clip} cover={cover} ts={p.ts} />
                : <PostPhotos srcs={images} leadAt={typeof (p.meta as { videoAt?: unknown })?.videoAt === 'number' ? (p.meta as { videoAt: number }).videoAt : 0} onOpen={(start) => setBig({ srcs: images, start })} lead={<PostVideo tile video={clip} cover={cover} ts={p.ts} hold={!!watch} onOpen={() => setWatch({ video: clip, cover })} />} />)
              : images.length > 0 && <PostPhotos srcs={images} onOpen={(start) => setBig({ srcs: images, start })} />}
            <div className="row post-actions">
              <div className="post-action-group">
                {p.crews.some((id) => crews.some((c) => c.id === id)) && <div className="post-like-group">
                  <button className={`post-like ${p.liked ? 'on' : ''}`} aria-label={p.liked ? 'Unlike post' : 'Like post'} aria-pressed={p.liked} onClick={() => like(p)}><Icon name="heart" size={22} /></button>
                  {p.likes > 0 && (userId
                    ? <button className="post-like-count" onClick={() => setActivity({ post: p, tab: 'likes' })} aria-label={`See who liked this post, ${p.likes} ${p.likes === 1 ? 'like' : 'likes'}`}>{p.likes}</button>
                    : <span className="post-like-count">{p.likes}</span>)}
                </div>}
                {userId && <div className="post-like-group">
                  <button className="post-like" aria-label={(p.comments ?? 0) > 0 ? `See the ${p.comments} ${p.comments === 1 ? 'comment' : 'comments'}` : 'Comment on this post'} onClick={() => setActivity({ post: p, tab: 'comments' })}><Icon name="comment" size={22} /></button>
                  {(p.comments ?? 0) > 0 && <button className="post-like-count" onClick={() => setActivity({ post: p, tab: 'comments' })} aria-label={`See the ${p.comments} ${p.comments === 1 ? 'comment' : 'comments'}`}>{p.comments}</button>}
                </div>}
              </div>
              {p.mine ? <button className="link-danger" onClick={() => setDel(p)}>Delete</button> : userId && <button type="button" className="quiet-action" onClick={() => setReporting(p)}>Report</button>}
            </div>
            {caption && <p className="post-caption"><b>{p.name.split(' ')[0]}</b> {caption}</p>}
            {userId && (p.comments ?? 0) > 0 && (
              <div className="post-preview">
                {(p.comments ?? 0) > (p.preview?.length ?? 0) && <button type="button" className="post-preview-all" onClick={() => setActivity({ post: p, tab: 'comments' })}>View all {p.comments} comments</button>}
                {p.preview?.map((c, i) => <button type="button" key={i} className="post-preview-line" aria-label={`${c.name.split(' ')[0]} said: ${c.text}. Open the comments.`} onClick={() => setActivity({ post: p, tab: 'comments' })}><b>{c.name.split(' ')[0]}</b> {c.text}</button>)}
              </div>
            )}
          </article>
        )
      })}
      {activity && userId && <PostActivity post={activity.post} tab={activity.tab} me={userId} onClose={() => { setActivity(null); refresh?.() }} />}
      {big && <Lightbox srcs={big.srcs} start={big.start} onClose={() => setBig(null)} />}
      {watch && <VideoViewer video={watch.video} cover={watch.cover} onClose={() => setWatch(null)} />}
      {reporting && <ConfirmSheet title="Report this post?" message="Tell us if this post breaks the rules or makes you uncomfortable. We will take a look. They will not be told it was you." confirmLabel="Report it" onConfirm={() => { const p = reporting; setReporting(null); void reportPostCloud(p.id, userId ?? '').then((e) => { if (e) setErr(e); else { setErr(''); setNote('Reported. Thank you, we will take a look.'); setTimeout(() => setNote(''), 6000) } }) }} onCancel={() => setReporting(null)} />}
      {del && <ConfirmSheet title="Delete this post?" message="Are you sure you want to delete this post? It will be removed for everyone in the crew." confirmLabel="Yes, delete it" onConfirm={() => void remove(del)} onCancel={() => setDel(null)} />}
    </>
  )
}

/** The popup behind the heart count and the comment button: who liked the post, and what people said (with the box to say something). */
function PostActivity({ post, tab: first, me, onClose }: { post: FeedPost; tab: 'likes' | 'comments'; me: string; onClose: () => void }) {
  const [tab, setTab] = useState(first)
  const [likers, setLikers] = useState<LikerRow[] | null>(null)
  const [comments, setComments] = useState(post.comments)
  useEffect(() => { void fetchPostLikers(post.id, post.crewId).then(setLikers).catch(() => setLikers([])) }, [post.id, post.crewId])
  return (
    <Sheet title="Likes and comments" onClose={onClose}>
      <div className="activity-tabs" role="group" aria-label="Likes or comments">
        <button type="button" className={tab === 'likes' ? 'on' : ''} aria-pressed={tab === 'likes'} onClick={() => setTab('likes')}>Likes{likers ? ` ${likers.length}` : ''}</button>
        <button type="button" className={tab === 'comments' ? 'on' : ''} aria-pressed={tab === 'comments'} onClick={() => setTab('comments')}>Comments {comments}</button>
      </div>
      {tab === 'likes' ? <LikersList people={likers} /> : <CommentsPanel postId={post.id} me={{ id: me }} postMine={post.mine} onCount={setComments} />}
    </Sheet>
  )
}

/**
 * A post's pictures, like Strava: one fills the post; with more, the first is nearly full width and the edge of the next peeks in,
 * so it is one panel you roll through freely, without having to swipe each one all the way. `leadAt` is where the video sits.
 */
function PostPhotos({ srcs, onOpen, lead, leadAt = 0 }: { srcs: string[]; onOpen: (i: number) => void; lead?: ReactNode; leadAt?: number }) {
  const total = srcs.length + (lead ? 1 : 0)
  const [at, setAt] = useState(0)
  const what = lead ? `A video and ${srcs.length} photo${srcs.length === 1 ? '' : 's'}` : `${srcs.length} photo${srcs.length === 1 ? '' : 's'}`
  const items: ReactNode[] = srcs.map((src, i) => <button className="post-strip-item" role="listitem" key={src} aria-label={`Open photo ${i + 1} of ${srcs.length}`} onClick={() => onOpen(i)}><img src={src} alt={`Post photo ${i + 1}`} loading="lazy" /></button>)
  if (lead) items.splice(Math.min(Math.max(0, leadAt), srcs.length), 0, <div className="post-strip-item post-strip-video" role="listitem" key="video">{lead}</div>)
  const scrolled = (el: HTMLElement) => {
    const step = ((el.firstElementChild as HTMLElement | null)?.offsetWidth ?? el.clientWidth) + 6
    setAt(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 ? total - 1 : Math.min(total - 1, Math.max(0, Math.round(el.scrollLeft / step))))
  }
  return <div className="post-carousel">
    <div className="post-strip" data-count={Math.min(total, 4)} role="list" aria-label={`${what}${total > 1 ? ', swipe to see more' : ''}`} onScroll={total > 1 ? (e) => scrolled(e.currentTarget) : undefined}>{items}</div>
    {total > 1 && <div className="post-dots" aria-hidden="true">{Array.from({ length: total }, (_, i) => <i key={i} className={i === at ? 'on' : ''} />)}</div>}
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
  // the clip's own shape, once the cover or the clip has loaded, so the frame is exactly the video: no bars around it (never taller than 9:16 or wider than 16:9)
  const [shape, setShape] = useState<number | null>(null)
  const learn = (w: number, h: number) => { if (w > 0 && h > 0) setShape(Math.min(16 / 9, Math.max(9 / 16, w / h))) }
  const frame = { aspectRatio: String(shape ?? 0.8) }
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
        <button className="post-video-cover" style={frame} aria-label={length ? `Play video, ${length}` : 'Play video'} onClick={tapCover}>
          {cover ? <img src={cover} alt="" loading="lazy" onLoad={(e) => learn(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)} /> : <span className="post-video-blank" />}
          <span className="post-video-play"><Icon name="play" size={26} /></span>
          {length && <span className="post-video-time">{length}</span>}
        </button>
        {err && <p className="small err" role="alert">{err}</p>}
        {note}
      </div>
    )
  }
  return (
    <div ref={box} className="post-video-wrap" style={frame}>
      <video ref={el} className="post-video" src={src} poster={cover} muted={!engaged} loop playsInline preload="auto" controls={controls && !blocked}
        onLoadedMetadata={(e) => learn(e.currentTarget.videoWidth, e.currentTarget.videoHeight)} onCanPlay={() => { if (engaged) void start(); else scheduleChoose() }} onClick={tapVideo}
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
