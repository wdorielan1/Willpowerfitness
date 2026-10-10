import { useEffect, useRef, useState } from 'react'
import { useApp } from '../store'
import { ConfirmSheet, Lightbox } from '../components'
import { createPostCloud, deletePostCloud, ensureMemberCloud, toggleLikeCloud, useCrewFeed } from '../cloud'
import { CREW_BUCKET, postPhotos, compress, deletePhotoBlob, savePhotoBlob, usePhotoUrls } from '../photos'
import { Icon } from '../icons'
import { todayISO } from '../engine'
import type { CrewPost, PostKind } from '../types'

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
  const post = async (p: { kind: PostKind; text: string; photos?: Blob[]; meta?: Record<string, unknown>; progress?: (text: string) => void }): Promise<string | null> => {
    const imagePaths: string[] = [], imageIds: string[] = []
    const uploaded: { id: string; path?: string }[] = []
    try {
      if ((p.photos?.length ?? 0) > 10) throw new Error('Choose up to 10 photos.')
      if (userId) {
        p.progress?.('Confirming membership…')
        const m = await ensureMemberCloud(crewId, userId, name)
        if (m) throw new Error(`Couldn’t confirm your crew membership: ${m}`)
      }
      for (const [i, photo] of (p.photos ?? []).entries()) {
        p.progress?.(`Uploading ${i + 1} of ${p.photos!.length}`)
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
        const error = await createPostCloud({ crewId, userId, name, kind: p.kind, text: p.text, imagePaths, meta: p.meta })
        if (error) throw new Error(error)
        feed?.refresh()
      } else {
        const local: CrewPost = { id: crypto.randomUUID(), crewId, name, kind: p.kind, text: p.text, imagePaths, imageIds, meta: p.meta, ts: Date.now(), mine: true, likes: 0, liked: false }
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

export default function Feed({ crewId }: { crewId: string }) {
  const { data, update, userId } = useApp()
  const { post, feed } = usePostActions(crewId)
  const [text, setText] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [progress, setProgress] = useState('Posting…')
  const posting = useRef(false)
  useEffect(() => {
    const urls = photos.map((p) => URL.createObjectURL(p)); setPreviews(urls)
    return () => urls.forEach(URL.revokeObjectURL)
  }, [photos])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [del, setDel] = useState<CrewPost | null>(null)
  const [big, setBig] = useState<{ srcs: string[]; start: number } | null>(null)
  const file = useRef<HTMLInputElement>(null)
  const todaysLog = data.logs.find((l) => l.date === todayISO() && !l.baseline && !l.imported)
  const posts = feed ? feed.posts : data.posts.filter((p) => p.crewId === crewId).sort((a, b) => b.ts - a.ts)
  const urls = usePhotoUrls(posts.flatMap(postPhotos), CREW_BUCKET)

  const submit = async (override?: { kind: PostKind; text: string; meta?: Record<string, unknown> }) => {
    if (posting.current) return
    const selected = override ? [] : photos
    const body = override ?? { kind: (selected.length ? 'photo' : 'post') as PostKind, text: text.trim() }
    if (!body.text && !selected.length) return
    posting.current = true; setBusy(true); setErr(''); setProgress('Posting…')
    try {
      const error = await post({ ...body, photos: selected, progress: setProgress })
      if (error) { setErr(error); return }
      if (!override) { setText(''); setPhotos([]) }
    } catch (error) { setErr(error instanceof Error ? error.message : String(error)) }
    finally { posting.current = false; setBusy(false) }
  }

  const shareWorkout = () => {
    if (!todaysLog) return
    const sets = todaysLog.entries.reduce((a, e) => a + e.sets.length, 0)
    const vol = todaysLog.entries.reduce((a, e) => a + e.sets.reduce((s, x) => s + x.weight * x.reps, 0), 0)
    void submit({ kind: 'workout', text: `Finished ${todaysLog.dayType}${todaysLog.minutes ? ` in ${todaysLog.minutes} min` : ''}`, meta: { sets, volume: Math.round(vol), exercises: todaysLog.entries.length } })
  }

  const like = (p: CrewPost) => {
    if (userId) { void toggleLikeCloud(p.id, userId, p.liked).then(() => feed?.refresh()); return }
    update((d) => ({ ...d, posts: d.posts.map((x) => (x.id === p.id ? { ...x, liked: !x.liked, likes: x.likes + (x.liked ? -1 : 1) } : x)) }))
  }
  const remove = async (p: CrewPost) => {
    try {
      if (userId) await deletePostCloud(p.id)
      else {
        await Promise.all(postPhotos(p).map((photo) => deletePhotoBlob(photo, CREW_BUCKET)))
        update((d) => ({ ...d, posts: d.posts.filter((x) => x.id !== p.id) }))
      }
      if (p.kind === 'qotd') { // deleting the answer brings the question back
        const when = new Date(p.ts), day = `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, '0')}-${String(when.getDate()).padStart(2, '0')}`
        update((d) => ({ ...d, qotd: Object.fromEntries(Object.entries(d.qotd).filter(([k]) => k !== day && !k.endsWith(`|${day}`))) }))
      }
      feed?.refresh(); setDel(null)
    } catch (error) { setDel(null); setErr(error instanceof Error ? error.message : String(error)) }
  }

  return (
    <>
      <section className="card feed-composer">
        <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Share something with your crew" maxLength={1000} />
        {previews.length > 0 && <div className="photo-previews">{previews.map((src, i) => <div key={src}>
          <img src={src} alt={`Selected photo ${i + 1}`} />
          <button disabled={busy} aria-label={`Remove photo ${i + 1}`} onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}><Icon name="close" size={16} /></button>
        </div>)}</div>}
        <input ref={file} type="file" accept="image/*" multiple disabled={busy} hidden onChange={(e) => {
          const picked = Array.from(e.target.files ?? [])
          if (picked.length + photos.length > 10) setErr('Choose up to 10 photos.')
          else { setPhotos((p) => [...p, ...picked]); setErr('') }
          e.target.value = ''
        }} />
        <div className="row wrap composer-actions">
          <button className="ghost small-btn" disabled={busy || photos.length >= 10} onClick={() => file.current?.click()}><Icon name="photo" size={18} /> Add photos</button>
          {todaysLog && <button className="ghost small-btn" onClick={shareWorkout} disabled={busy}><Icon name="weight" size={18} />Share workout</button>}
          <span style={{ flex: 1 }} />
          <button className="primary small-btn" onClick={() => void submit()} disabled={busy || (!text.trim() && !photos.length)}>{busy ? progress : 'Post'}</button>
        </div>
        {busy && <p className="small mute" role="status">{progress}</p>}
        {err && <p role="alert" className="err small">{err}</p>}
      </section>

      {posts.length === 0 && <section className="feed-empty"><span className="icon-surface"><Icon name="weight" /></span><h3>No posts yet.</h3><p>Post a workout, ask a question,<br />or let your crew know you’re coming.</p></section>}
      {posts.map((p) => {
        const images = postPhotos(p).map((photo) => urls[photo.id]).filter(Boolean)
        const meta = p.meta as { sets?: number; volume?: number; exercises?: number; q?: string } | undefined
        return (
          <article key={p.id} className="card post">
            <div className="row">
              <div className="person"><span className="avatar">{p.name[0]}</span><div><b>{p.name.split(' ')[0]}{p.mine ? ' (you)' : ''}</b><div className="small mute">{timeAgo(p.ts)}</div></div></div>
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
            {images.length > 0 && <PostCarousel srcs={images} onOpen={(start) => setBig({ srcs: images, start })} />}
            <div className="row">
              <button className={`post-like ${p.liked ? 'on' : ''}`} aria-label={p.liked ? 'Unlike post' : 'Like post'} aria-pressed={p.liked} onClick={() => like(p)}><Icon name="heart" size={20} />{p.likes || ''}</button>
              {p.mine && <button className="link-danger" onClick={() => setDel(p)}>Delete</button>}
            </div>
          </article>
        )
      })}
      {big && <Lightbox srcs={big.srcs} start={big.start} onClose={() => setBig(null)} />}
      {del && <ConfirmSheet title="Delete this post?" message="Are you sure you want to delete this post? It will be removed for everyone in the crew." confirmLabel="Yes, delete it" onConfirm={() => void remove(del)} onCancel={() => setDel(null)} />}
    </>
  )
}

function PostCarousel({ srcs, onOpen }: { srcs: string[]; onOpen: (i: number) => void }) {
  const [index, setIndex] = useState(0)
  const track = useRef<HTMLDivElement>(null)
  return <div className="post-carousel">
    <div className="post-photo-track" ref={track} onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
      {srcs.map((src, i) => <button className="post-photo" key={src} aria-label={`Open photo ${i + 1} of ${srcs.length}`} onClick={() => onOpen(i)}><img src={src} alt={`Post photo ${i + 1}`} loading="lazy" /></button>)}
    </div>
    {srcs.length > 1 && <><span className="photo-counter">{index + 1}/{srcs.length}</span><div className="dots">{srcs.map((_, i) => <button key={i} aria-label={`Show photo ${i + 1}`} aria-current={i === index} className={`dot ${i === index ? 'on' : ''}`} onClick={() => track.current?.scrollTo({ left: i * track.current.clientWidth, behavior: 'smooth' })} />)}</div></>}
  </div>
}
