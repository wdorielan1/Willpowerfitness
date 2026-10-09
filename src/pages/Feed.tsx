import { useRef, useState } from 'react'
import { useApp } from '../store'
import { ConfirmSheet, Lightbox } from '../components'
import { createPostCloud, deletePostCloud, ensureMemberCloud, toggleLikeCloud, useCrewFeed } from '../cloud'
import { CREW_BUCKET, withTimeout, compress, deletePhotoBlob, savePhotoBlob, usePhotoUrls } from '../photos'
import { ENCOURAGEMENTS } from '../data'
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
  const post = async (p: { kind: PostKind; text: string; photo?: Blob; meta?: Record<string, unknown> }): Promise<string | null> => {
    let imagePath: string | undefined
    let imageId: string | undefined
    // Posting is only allowed for crew members. Repair a missing membership row first.
    if (userId) {
      const m = await ensureMemberCloud(crewId, userId, name)
      if (m) return `Couldn’t confirm your crew membership: ${m}`
    }
    if (p.photo) {
      const small = await compress(p.photo)
      const id = `${Date.now()}`
      if (userId) {
        const r = await savePhotoBlob(id, small, userId, CREW_BUCKET, `${crewId}/${userId}`)
        if (r.where !== 'cloud') return `Photo upload failed${r.error ? `: ${r.error}` : ''}. If this says the bucket wasn’t found, the storage part of schema.sql needs to be run.`
        imagePath = r.path
      } else { await savePhotoBlob(id, small, null); imageId = id }
    }
    if (userId) {
      const err = await createPostCloud({ crewId, userId, name, kind: p.kind, text: p.text, imagePath, meta: p.meta })
      feed?.refresh()
      return err ? `Couldn’t post: ${err}` : null
    }
    const local: CrewPost = { id: `${Date.now()}`, crewId, name, kind: p.kind, text: p.text, imageId, meta: p.meta, ts: Date.now(), mine: true, likes: 0, liked: false }
    update((d) => ({ ...d, posts: [local, ...d.posts] }))
    return null
  }
  return { post, feed }
}

export default function Feed({ crewId }: { crewId: string }) {
  const { data, update, userId } = useApp()
  const { post, feed } = usePostActions(crewId)
  const [text, setText] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [del, setDel] = useState<CrewPost | null>(null)
  const [big, setBig] = useState<string | null>(null)
  const file = useRef<HTMLInputElement>(null)
  const today = todayISO()
  const todaysLog = data.logs.find((l) => l.date === today && !l.baseline && !l.imported)

  const posts = feed ? feed.posts : data.posts.filter((p) => p.crewId === crewId).sort((a, b) => b.ts - a.ts)
  const urls = usePhotoUrls(posts.filter((p) => p.imagePath || p.imageId).map((p) => ({ id: p.imageId ?? p.id, path: p.imagePath })), CREW_BUCKET)
  const preview = photo ? URL.createObjectURL(photo) : null

  const submit = async (override?: { kind: PostKind; text: string; meta?: Record<string, unknown> }) => {
    const body = override ?? { kind: (photo ? 'photo' : 'post') as PostKind, text: text.trim() }
    if (!body.text && !photo) return
    setBusy(true); setErr('')
    let e: string | null
    try { e = await withTimeout(post({ ...body, photo: override ? undefined : photo ?? undefined }), 60000, 'Posting') }
    catch (x) { e = (x as Error).message || 'Something went wrong posting.' }
    setBusy(false)
    if (e) { setErr(e); return }
    if (!override) { setText(''); setPhoto(null) }
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
    if (userId) await deletePostCloud(p.id)
    if (p.imagePath || p.imageId) await deletePhotoBlob({ id: p.imageId ?? p.id, path: p.imagePath }, CREW_BUCKET)
    if (!userId) update((d) => ({ ...d, posts: d.posts.filter((x) => x.id !== p.id) }))
    else feed?.refresh()
    setDel(null)
  }

  return (
    <>
      <section className="card">
        <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Share a win, a photo, or some encouragement" maxLength={1000} />
        {preview && (
          <div style={{ position: 'relative' }}>
            <img src={preview} alt="Your photo" style={{ width: '100%', maxHeight: 280, objectFit: 'cover', borderRadius: 12 }} />
            <button className="small-btn" style={{ position: 'absolute', top: 8, right: 8 }} onClick={() => setPhoto(null)}>✕</button>
          </div>
        )}
        <input ref={file} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) setPhoto(f); e.target.value = '' }} />
        <div className="row wrap">
          <button className="ghost small-btn" onClick={() => file.current?.click()}>📷 Photo</button>
          {todaysLog && <button className="ghost small-btn" onClick={shareWorkout} disabled={busy}>💪 Share today’s workout</button>}
          <span style={{ flex: 1 }} />
          <button className="primary small-btn" onClick={() => void submit()} disabled={busy || (!text.trim() && !photo)}>{busy ? 'Posting…' : 'Post'}</button>
        </div>
        <div className="chips">{ENCOURAGEMENTS.slice(0, 3).map((m) => <button key={m} className="chip" onClick={() => void submit({ kind: 'post', text: m })}>{m}</button>)}</div>
        {err && <p className="err small">{err}</p>}
      </section>

      {posts.length === 0 && <section className="card"><p className="mute">No posts yet. Be the first to share something.</p></section>}
      {posts.map((p) => {
        const img = urls[p.imageId ?? p.id]
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
            {img && <img src={img} alt="" loading="lazy" onClick={() => setBig(img)} style={{ width: '100%', maxHeight: 420, objectFit: 'cover', borderRadius: 12, cursor: 'zoom-in' }} />}
            <div className="row">
              <button className={`chip ${p.liked ? 'on' : ''}`} onClick={() => like(p)}>🔥 {p.likes || ''}</button>
              {p.mine && <button className="link-danger" onClick={() => setDel(p)}>Delete</button>}
            </div>
          </article>
        )
      })}
      {big && <Lightbox srcs={[big]} onClose={() => setBig(null)} />}
      {del && <ConfirmSheet title="Delete this post?" message="Are you sure you want to delete this post? It will be removed for everyone in the crew." confirmLabel="Yes, delete it" onConfirm={() => void remove(del)} onCancel={() => setDel(null)} />}
    </>
  )
}
