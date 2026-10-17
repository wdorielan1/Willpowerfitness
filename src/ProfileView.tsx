import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from './components'
import { Icon, type IconName } from './icons'
import { addDays, fromISO, todayISO } from './engine'
import { BADGES, type ProfileStats } from './profileStats'
import { CREW_BUCKET, postPhotos, postVideo, usePhotoUrls, videoUrl } from './photos'
import { fmtVolume, readWorkoutPost } from './workoutPost'
import type { PublicPost } from './cloud'

const TABS = [
  { id: 'posts', label: 'Posts', icon: 'grid' },
  { id: 'stats', label: 'Stats', icon: 'chart' },
  { id: 'achievements', label: 'Achievements', icon: 'trophy' },
  { id: 'about', label: 'About', icon: 'person' },
] as const
const postDate = (post: PublicPost) => new Date(post.ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
const timeTotal = (minutes?: number) => minutes == null ? '—' : minutes < 60 ? `${minutes}m` : `${Math.round(minutes / 6) / 10}h`
const badgeIcon = (id: string): IconName => id.startsWith('streak') ? 'flame' : id === 'early' ? 'clock' : id === 'crew' ? 'crew' : 'trophy'

function Calendar({ days }: { days: string[] }) {
  const today = todayISO()
  const done = new Set(days)
  const mondayOffset = (fromISO(today).getDay() + 6) % 7
  const start = addDays(today, -mondayOffset - 77)
  const cells = Array.from({ length: 84 }, (_, i) => addDays(start, i))
  const count = cells.filter((d) => d <= today && done.has(d)).length
  return <div className="pv-cal" role="img" aria-label={`${count} days with a finished workout in the last 12 weeks`}>
    {cells.map((d) => <span key={d} className={`pv-day ${d > today ? 'is-future' : done.has(d) ? 'is-done' : ''}`} title={d} />)}
  </div>
}

function PostMetrics({ post }: { post: PublicPost }) {
  const w = readWorkoutPost(post)
  return <span className="pv-post-metrics">
    {w.minutes != null && <span><Icon name="clock" />{w.minutes} <small>MIN</small></span>}
    {w.sets > 0 && <span><Icon name="weight" />{w.sets} <small>SETS</small></span>}
    {w.volume != null && <span><Icon name="flame" />{fmtVolume(w.volume)} <small>LB</small></span>}
  </span>
}

function PostDetail({ post, crew, onClose }: { post: PublicPost; crew: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const photos = postPhotos(post)
  const urls = usePhotoUrls(photos, CREW_BUCKET)
  const video = postVideo(post.meta)
  const [clip, setClip] = useState<string | null>(null)
  const [clipError, setClipError] = useState(false)
  const workout = post.kind === 'workout' ? readWorkoutPost(post) : null
  useEffect(() => {
    const el = dialog.current!
    const previousFocus = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    el.showModal()
    return () => { el.close(); document.body.style.overflow = overflow; previousFocus?.focus() }
  }, [])
  useEffect(() => {
    if (!video || video.expired) return
    let alive = true, made: string | null = null
    void videoUrl(video).then((url) => {
      if (!alive) { if (url?.startsWith('blob:')) URL.revokeObjectURL(url); return }
      made = url; setClip(url); setClipError(!url)
    }).catch(() => alive && setClipError(true))
    return () => { alive = false; if (made?.startsWith('blob:')) URL.revokeObjectURL(made) }
  }, [post.id]) // eslint-disable-line react-hooks/exhaustive-deps
  return <dialog className="pv-detail" ref={dialog} aria-labelledby={titleId} onCancel={(e) => { e.preventDefault(); onClose() }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
    <div className="pv-detail-inner">
      <div className="row"><h2 id={titleId}>{workout?.title ?? 'Post'}</h2><button className="icon-button" aria-label="Close post" onClick={onClose}><Icon name="close" /></button></div>
      <p className="small mute">{crew} · {new Date(post.ts).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
      {video && (clip ? <video src={clip} controls playsInline preload="metadata" onError={() => { setClip(null); setClipError(true) }} /> : <p className="small mute">{video.expired ? 'This video has expired.' : clipError ? 'Video unavailable.' : 'Loading video…'}</p>)}
      {photos.map((photo, i) => urls[photo.id] ? <img key={photo.id} src={urls[photo.id]} alt={`Shared photo ${i + 1}`} onError={(e) => { e.currentTarget.hidden = true }} /> : <div key={photo.id} className="pv-media-unavailable"><Icon name="photo" /><span>Photo unavailable</span></div>)}
      {workout && <PostMetrics post={post} />}
      {post.text && <p className="pv-detail-text">{post.text}</p>}
      {workout?.caption && <p className="pv-detail-text">{workout.caption}</p>}
      {workout?.place && <p className="small mute">{workout.place}</p>}
      {!!workout?.lifts.length && <div className="pv-lifts">{workout.lifts.map((lift, i) => <div className="row" key={i}><span>{lift.n}</span><b>{lift.w} lb × {lift.r}</b></div>)}</div>}
      {!!workout?.prs.length && <p className="pv-pr"><Icon name="trophy" />Personal best · {workout.prs.map((pr) => pr.name).join(', ')}</p>}
    </div>
  </dialog>
}

function PostTile({ post, url, onOpen }: { post: PublicPost; url?: string; onOpen: () => void }) {
  const [failed, setFailed] = useState(false)
  const workout = post.kind === 'workout' ? readWorkoutPost(post) : null
  const video = postVideo(post.meta)
  const title = workout?.title ?? (post.kind === 'qotd' ? 'Daily question' : video ? 'Crew clip' : post.hasPhoto ? 'Photo' : 'Check-in')
  const photo = url && !failed
  return <button className={`pv-tile ${photo ? 'has-photo' : 'is-graphic'} ${workout ? 'is-workout' : ''}`} onClick={onOpen} aria-label={`Open ${title}, ${postDate(post)}`}>
    {photo && <img src={url} alt="" loading="lazy" onError={() => setFailed(true)} />}
    <span className="pv-tile-top"><time dateTime={new Date(post.ts).toISOString()}>{postDate(post)}</time><Icon name={video ? 'play' : postPhotos(post).length > 1 ? 'copy' : 'arrow'} size={14} /></span>
    {!photo && <span className="pv-tile-mark" aria-hidden="true"><Icon name={workout ? 'weight' : video ? 'play' : post.hasPhoto ? 'photo' : 'file'} size={32} /></span>}
    <span className="pv-tile-content">
      {!workout && !photo && post.text && <span className="pv-tile-excerpt">{post.text}</span>}
      <b className="pv-tile-title">{title}</b>
      {workout && <PostMetrics post={post} />}
      {!!workout?.prs.length && <span className="pv-tile-pr"><Icon name="trophy" size={12} />NEW PR</span>}
    </span>
  </button>
}

export interface ProfileViewProps {
  name: string; handle?: string | null; avatar?: string | null; bio?: string | null
  stats?: ProfileStats | null; posts?: PublicPost[] | null
  crewName: (id: string) => string
  showLocked?: boolean; actions?: ReactNode; about?: ReactNode; status?: ReactNode
  onEditAvatar?: () => void
  emptyPosts?: string; postsError?: string; onRetryPosts?: () => void
  followers?: number | null; following?: number | null; countsLink?: boolean
  onCrew?: (id: string) => void; crewJoined?: (id: string) => boolean
}

export default function ProfileView(p: ProfileViewProps) {
  const [tab, setTab] = useState<typeof TABS[number]['id']>('posts')
  const [selected, setSelected] = useState<PublicPost | null>(null)
  const id = useId()
  const st = p.stats ?? {}
  const earned = new Set(st.badges ?? [])
  const badges = BADGES.filter((b) => p.showLocked || earned.has(b.id))
  const crews = st.crews ?? []
  const thumbnails = (p.posts ?? []).flatMap((post) => postPhotos(post).slice(0, 1))
  const urls = usePhotoUrls(thumbnails, CREW_BUCKET)
  return <div className="pv">
    <section className="pv-head" aria-label="Profile">
      <div className="pv-identity">
        <div className="pv-avatar"><Avatar key={p.avatar} name={p.name} url={p.avatar} />{p.onEditAvatar && <button className="pv-avatar-edit" aria-label="Change profile photo" onClick={p.onEditAvatar}><Icon name="edit" size={17} /></button>}</div>
        <div className="pv-intro"><h1 className="pv-name">{p.name}</h1>{p.handle && <p className="pv-handle">@{p.handle}</p>}{p.bio && <p className="pv-bio">{p.bio}</p>}</div>
      </div>
      {p.actions && <div className="pv-actions">{p.actions}</div>}
      {(p.followers != null || p.following != null) && <div className="pv-counts">{p.countsLink
        ? <><Link to="/friends?tab=followers"><b>{p.followers ?? 0}</b> followers</Link><Link to="/friends?tab=following"><b>{p.following ?? 0}</b> following</Link></>
        : <><span><b>{p.followers ?? 0}</b> followers</span><span><b>{p.following ?? 0}</b> following</span></>}</div>}
      <div className="pv-stats" aria-label="Training totals">
        <div><b>{st.workoutsTotal ?? '—'}</b><span>Workouts</span></div>
        <div><b>{timeTotal(st.minutesTotal)}</b><span>Total time</span></div>
        <div><b>{fmtVolume(st.volumeTotal)}</b><span>Volume (LB)</span></div>
        <div><b>{st.streak ?? '—'}</b><span>Day streak</span></div>
      </div>
    </section>
    {p.status}
    <button className="pv-streak" onClick={() => { setTab('stats'); document.getElementById(`${id}-stats`)?.focus() }}>
      <span className="pv-streak-icon"><Icon name="flame" size={34} /></span>
      <span><b>{st.streak ? `${st.streak} day streak` : 'Every workout counts'}</b><span>{st.streak ? 'Keep it going. You’re building something.' : 'Show up today. Build your momentum.'}</span></span>
      <Icon name="chevron" size={19} />
    </button>
    <div className="pv-tabs" role="tablist" aria-label="Profile sections">
      {TABS.map((t, i) => <button key={t.id} role="tab" id={`${id}-${t.id}`} aria-controls={`${id}-panel`} aria-selected={tab === t.id} tabIndex={tab === t.id ? 0 : -1} onClick={() => setTab(t.id)} onKeyDown={(e) => {
        const next = e.key === 'ArrowRight' ? (i + 1) % 4 : e.key === 'ArrowLeft' ? (i + 3) % 4 : e.key === 'Home' ? 0 : e.key === 'End' ? 3 : -1
        if (next < 0) return
        e.preventDefault(); setTab(TABS[next].id); document.getElementById(`${id}-${TABS[next].id}`)?.focus()
      }}><Icon name={t.icon} size={20} /><span>{t.label}</span></button>)}
    </div>
    <div className="pv-panel" role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-${tab}`} tabIndex={0}>
      {tab === 'posts' && (p.postsError ? <div className="pv-empty" role="status"><Icon name="grid" size={28} /><p>{p.postsError}</p>{p.onRetryPosts && <button className="ghost small-btn" onClick={p.onRetryPosts}>Try again</button>}</div>
        : !p.posts ? <div className="pv-post-grid" aria-label="Loading posts" aria-busy="true">{Array.from({ length: 6 }, (_, i) => <div key={i} className="pv-tile pv-skeleton" />)}</div>
        : p.posts.length ? <div className="pv-post-grid">{p.posts.map((post) => <PostTile key={post.id} post={post} url={urls[postPhotos(post)[0]?.id]} onOpen={() => setSelected(post)} />)}</div>
        : <div className="pv-empty"><Icon name="grid" size={30} /><h2>Nothing shared yet</h2><p>{p.emptyPosts ?? 'No posts yet.'}</p></div>)}
      {tab === 'stats' && <>
        <section className="card pv-consistency"><div className="row"><h2>Consistency</h2><span className="tag accent">{st.workouts30 ?? '—'} in 30 days</span></div><p className="small mute">12 weeks of showing up. One square, one day.</p><Calendar days={st.days ?? []} /><div className="pv-calendar-key"><span>Less</span><i /><i className="filled" /><span>More</span></div></section>
        <section className="card"><h2>The work adds up</h2><div className="pv-stat-line"><Icon name="weight" /><span>Workouts completed</span><b>{st.workoutsTotal ?? '—'}</b></div><div className="pv-stat-line"><Icon name="clock" /><span>Recorded training time</span><b>{timeTotal(st.minutesTotal)}</b></div><div className="pv-stat-line"><Icon name="chart" /><span>Total lifted</span><b>{st.volumeTotal == null ? '—' : `${st.volumeTotal.toLocaleString()} lb`}</b></div>{st.since && <p className="small mute">Training since {fromISO(st.since).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</p>}</section>
      </>}
      {tab === 'achievements' && <section className="card"><div className="row"><h2>Earned through effort</h2><span className="tag accent">{earned.size} earned</span></div><p className="small mute">Small wins. Strong foundations.</p>{badges.length ? <div className="pv-badges">{badges.map((b) => <div key={b.id} className={`pv-badge ${earned.has(b.id) ? 'is-earned' : 'is-locked'}`}><Icon name={badgeIcon(b.id)} size={28} /><b>{b.label}</b><span>{b.hint}</span><small>{earned.has(b.id) ? 'Earned' : 'Keep going'}</small></div>)}</div> : <p className="mute small">Achievements will appear with completed workouts.</p>}</section>}
      {tab === 'about' && <>
        <section className="card"><h2>About {p.name.split(' ')[0]}</h2><p className="pv-about-bio">{p.bio || 'Building a stronger everyday.'}</p>{st.since && <p className="small mute">Training since {fromISO(st.since).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</p>}</section>
        <section className="card"><h2>Crews</h2><div className="chips">{crews.length === 0 ? <span className="small mute">Not in a crew yet</span> : crews.map((c) => p.onCrew ? <button key={c} className={`chip ${p.crewJoined?.(c) ? 'on' : ''}`} onClick={() => p.onCrew!(c)}><Icon name={p.crewJoined?.(c) ? 'check' : 'plus'} size={14} /> {p.crewName(c)}</button> : <span key={c} className="chip">{p.crewName(c)}</span>)}</div></section>
        {p.about}
      </>}
    </div>
    {selected && <PostDetail key={selected.id} post={selected} crew={p.crewName(selected.crewId)} onClose={() => setSelected(null)} />}
  </div>
}
