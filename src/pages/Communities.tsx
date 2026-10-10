import { useState } from 'react'
import { useApp } from '../store'
import { useCheckin } from '../actions'
import { CAT_LABEL, NAMES, type CommunityDef, type CrewCat } from '../data'
import { suggestCrews } from '../matching'
import MatchQuestions from '../MatchQuestions'
import SocialTabs from '../SocialTabs'
import { Sheet } from '../components'
import { fmtTime, streak, todayISO } from '../engine'
import { allCommunities, roster, stats } from './Crew'
import { INACTIVE_DAYS, cloudEnabled, createCrewCloud, deleteMyPostsCloud, joinCrewCloud, leaveCrewCloud, useCrewCounts, useLiveCrew } from '../cloud'
import Qotd from './Qotd'
import Feed from './Feed'
import { postPhotos, deletePhotoBlob, CREW_BUCKET } from '../photos'

export const MAX_CREWS = 3

export default function Communities() {
  const { data, update, userId } = useApp()
  const ci = useCheckin()
  const all = allCommunities(data.custom)
  const counts = useCrewCounts()
  const myName = data.name || 'You'
  const yours = all.filter((c) => data.joined.includes(c.id)).sort((a, b) => (a.id === data.primary ? -1 : b.id === data.primary ? 1 : 0))
  const [sel, setSel] = useState<string | null>(null)
  const crew = yours.find((c) => c.id === sel) ?? yours[0] ?? null
  const live = useLiveCrew(crew?.id ?? null, userId)

  const [finder, setFinder] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [cat, setCat] = useState<CrewCat | 'all'>('all')
  const [tune, setTune] = useState(false)
  const [swapFor, setSwapFor] = useState<CommunityDef | null>(null)
  const [leaving, setLeaving] = useState<CommunityDef | null>(null)
  const [alsoDelete, setAlsoDelete] = useState(false)
  const [name, setName] = useState('')
  const [time, setTime] = useState('06:00')
  const [vibe, setVibe] = useState('')

  // A user-made crew with no activity for 35 days is archived. Its posts and history are kept, and any new activity wakes it up.
  const isCustom = (c: CommunityDef) => data.custom.some((x) => x.id === c.id)
  const archived = (c: CommunityDef) => {
    if (!cloudEnabled || !isCustom(c)) return false
    const created = data.custom.find((x) => x.id === c.id)?.created ?? Date.now()
    const last = counts[c.id]?.lastActive ?? created
    return Date.now() - last > INACTIVE_DAYS * 86400000
  }
  const countOf = (c: CommunityDef) => (cloudEnabled ? counts[c.id]?.members ?? 0 : c.members)
  const visible = all.filter((c) => !data.joined.includes(c.id) && !archived(c))
  const suggested = suggestCrews(data.profile!, visible).slice(0, 3)
  const browse = visible.filter((c) => cat === 'all' || (c.cat ?? 'time') === cat)

  const reallyJoin = (id: string) => {
    update((d) => ({ ...d, joined: d.joined.includes(id) ? d.joined : [...d.joined, id], primary: d.primary && d.joined.includes(d.primary) ? d.primary : id }))
    if (userId) void joinCrewCloud(id, userId, myName, streak(data))
    setSel(id); setFinder(false); setSwapFor(null)
  }
  const join = (c: CommunityDef) => {
    if (data.joined.includes(c.id)) return
    if (data.joined.length >= MAX_CREWS) { setSwapFor(c); return }
    reallyJoin(c.id)
  }
  const leave = async (c: CommunityDef, deletePosts: boolean) => {
    try {
      if (userId) {
        if (deletePosts) await deleteMyPostsCloud(c.id, userId)
        await leaveCrewCloud(c.id, userId)
      } else if (deletePosts) {
        await Promise.all(data.posts.filter((p) => p.crewId === c.id).flatMap(postPhotos).map((p) => deletePhotoBlob(p, CREW_BUCKET)))
        update((d) => ({ ...d, posts: d.posts.filter((p) => p.crewId !== c.id) }))
      }
      update((d) => {
        const joined = d.joined.filter((x) => x !== c.id)
        return { ...d, joined, primary: d.primary === c.id ? joined[0] ?? null : d.primary }
      })
      setLeaving(null); setAlsoDelete(false); setSel(null)
    } catch (error) { window.alert(error instanceof Error ? error.message : String(error)) }
  }
  const create = () => {
    if (!name.trim()) return
    if (data.joined.length >= MAX_CREWS) { setSwapFor({ id: 'new', name: name.trim(), time, members: 1, rate: 0.7, vibe, blurb: '' }); return }
    createNow()
  }
  const createNow = () => {
    const id = `c${Date.now()}`
    const v = vibe.trim() || 'Time-based crew'
    update((d) => ({ ...d, custom: [...d.custom, { id, name: name.trim(), time, vibe: v, created: Date.now() }], joined: [...d.joined, id], primary: d.primary ?? id }))
    if (userId) void createCrewCloud(id, userId, name.trim(), time, v).then(() => joinCrewCloud(id, userId, myName, streak(data)))
    setName(''); setVibe(''); setSel(id); setFinder(false)
  }

  const Finder = (
    <>
      {suggested.length > 0 && (
        <>
          <div className="row"><h2>Suggested for you</h2><button className="ghost small-btn" onClick={() => setTune(true)}>Tune matches</button></div>
          {suggested.map((s) => (
            <section key={s.crew.id} className="card">
              <div className="row"><div><h3>{s.crew.name}</h3><div className="small mute">{s.crew.vibe}</div></div><span className="tag accent">{fmtTime(s.crew.time)}</span></div>
              <div className="chips">{s.reasons.map((r) => <span key={r} className="tag">{r}</span>)}</div>
              <div className="row"><span className="small mute">{countOf(s.crew)} member{countOf(s.crew) === 1 ? '' : 's'}</span><button className="primary small-btn" onClick={() => join(s.crew)}>Join</button></div>
            </section>
          ))}
        </>
      )}
      <button className="ghost" onClick={() => setShowAll(!showAll)}>{showAll ? 'Hide all crews' : `Browse all crews (${visible.length})`}</button>
      {showAll && (
        <>
          <div className="chips">{(['all', 'time', 'goal', 'life', 'work', 'age'] as const).map((k) => <button key={k} className={`chip ${cat === k ? 'on' : ''}`} onClick={() => setCat(k)}>{k === 'all' ? 'All' : CAT_LABEL[k]}</button>)}</div>
          {browse.map((c) => (
            <section key={c.id} className="card">
              <div className="row"><div><h3>{c.name}</h3><div className="small mute">{c.vibe}</div></div><span className="tag accent">{fmtTime(c.time)}</span></div>
              <div className="row"><span className="small mute">{countOf(c)} member{countOf(c) === 1 ? '' : 's'}</span><button className="primary small-btn" onClick={() => join(c)}>Join</button></div>
            </section>
          ))}
          {browse.length === 0 && <p className="small mute">Nothing here. Try another filter.</p>}
        </>
      )}
      <section className="card">
        <h2>Start a new crew</h2>
        <p className="small mute">Pick a time and rally people around it.</p>
        <label>Name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 5:45 AM Legs Crew" /></label>
        <label>Workout time<input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
        <label>Vibe (optional)<input value={vibe} onChange={(e) => setVibe(e.target.value)} placeholder="e.g. Heavy lifts, no excuses" /></label>
        <button className="primary" onClick={create}>Create crew</button>
      </section>
    </>
  )

  const cc = crew ? counts[crew.id] : undefined
  const sample = crew && !cloudEnabled ? stats(crew, ci.done) : null
  const people = crew
    ? cloudEnabled && live
      ? live.people.map((x) => ({ ...x, name: x.mine ? `${x.name} (you)` : x.name }))
      : roster(crew, todayISO(), ci.going ? { name: myName, going: true, done: ci.done } : undefined)
    : []
  const board = crew
    ? (cloudEnabled && live ? live.board.map((r) => ({ name: r.mine ? `${r.name} (you)` : r.name, streak: r.streak })) : [...roster(crew).map((r) => ({ name: r.name, streak: r.streak })), { name: `${myName} (you)`, streak: streak(data) }])
        .sort((a, b) => b.streak - a.streak).slice(0, 6)
    : []

  return (
    <>
      <SocialTabs />
      {!cloudEnabled && <div className="banner">Beta preview: teammates and counts are sample data until live crews launch. Your own posts are real.</div>}

      {!crew ? (
        <>
          <section className="card"><span className="tag">Solo mode</span><h2>You’re training on your own</h2><p className="small mute">That’s totally fine. Join a crew whenever you want company. You can be in up to {MAX_CREWS}.</p></section>
          {Finder}
        </>
      ) : (
        <>
          <div className="tabs">
            {yours.map((c) => <button key={c.id} className={c.id === crew.id ? 'on' : ''} onClick={() => setSel(c.id)} style={{ fontSize: 13 }}>{c.name.length > 14 ? c.name.slice(0, 13) + '…' : c.name}</button>)}
          </div>
          <div className="row"><span className="small mute">{yours.length} of {MAX_CREWS} crews</span><button className="ghost small-btn" onClick={() => setFinder(true)}>＋ Find crews</button></div>

          <section className="card hero">
            <div className="row"><div><h2>{crew.name}</h2><div className="small mute">{crew.vibe}</div></div><span className="tag accent">{fmtTime(crew.time)}</span></div>
            {archived(crew) && <div className="banner">This crew has been quiet for {INACTIVE_DAYS}+ days. Post something to wake it up.</div>}
            <div className="grid3">
              <div className="stat"><b>{cloudEnabled ? cc?.members ?? 1 : crew.members}</b><span>members</span></div>
              <div className="stat"><b>{cloudEnabled ? cc?.active ?? 0 : Math.round(crew.rate * 100) + '%'}</b><span>{cloudEnabled ? `active (${INACTIVE_DAYS}d)` : 'avg. rate'}</span></div>
              <div className="stat"><b>{cloudEnabled ? (cc?.members ? Math.round(((cc.done ?? 0) / cc.members) * 100) : 0) : sample?.pct}%</b><span>done today</span></div>
            </div>
            <p className="small mute">{crew.blurb}</p>
          </section>

          <Qotd crewId={crew.id} />
          <Feed key={crew.id} crewId={crew.id} />

          <details className="card">
            <summary style={{ fontWeight: 800, cursor: 'pointer' }}>Training today · Leaderboard</summary>
            <div className="people" style={{ marginTop: 10 }}>
              {cloudEnabled && people.length === 0 && <span className="small mute">Nobody has checked in yet. Be the first.</span>}
              {people.map((r) => <div className="person" key={r.name}><span className={`avatar ${r.status}`}>{r.name[0]}</span><span className="grow">{r.name}</span><span className={`tag ${r.status === 'done' ? 'ok' : 'accent'}`}>{r.status === 'done' ? 'Done' : 'Going'}</span></div>)}
            </div>
            <h3 style={{ marginTop: 14 }}>Streaks</h3>
            <div className="people" style={{ marginTop: 6 }}>
              {board.map((r, i) => <div className="person" key={r.name}><span className="avatar">{i + 1}</span><span className="grow">{r.name}</span><b>🔥 {r.streak}</b></div>)}
            </div>
          </details>

          <button className="link-danger" onClick={() => setLeaving(crew)}>Leave this crew</button>
        </>
      )}

      {finder && <Sheet title="Find crews" onClose={() => setFinder(false)}>{Finder}</Sheet>}
      {tune && (
        <Sheet title="Tune your matches" onClose={() => setTune(false)} z={50}>
          <MatchQuestions p={data.profile!} onChange={(patch) => update((d) => ({ ...d, profile: { ...d.profile!, ...patch } }))} />
        </Sheet>
      )}
      {swapFor && (
        <Sheet title={`You’re in ${MAX_CREWS} crews`} onClose={() => setSwapFor(null)} z={60}>
          <p>You can be in up to {MAX_CREWS} crews so each one gets your real attention. To {swapFor.id === 'new' ? 'start' : 'join'} <b>{swapFor.name}</b>, leave one of these first:</p>
          {yours.map((c) => (
            <button key={c.id} className="minirow" onClick={() => {
              void leave(c, false).then(() => {
                if (swapFor.id === 'new') { createNow(); setSwapFor(null) } else reallyJoin(swapFor.id)
              })
            }}>
              <span style={{ flex: 1, textAlign: 'left' }}><b>{c.name}</b><br /><span className="small mute">{fmtTime(c.time)}</span></span><span className="tag warn">Leave & {swapFor.id === 'new' ? 'start' : 'join'}</span>
            </button>
          ))}
          <p className="small mute">Leaving keeps your workouts, streaks and photos. Your posts stay in the crew.</p>
        </Sheet>
      )}
      {leaving && (
        <Sheet title={`Leave ${leaving.name}?`} onClose={() => { setLeaving(null); setAlsoDelete(false) }} z={70}>
          <p>Your workouts, streaks, photos and progress all stay with you. Your posts stay in the crew unless you choose to remove them.</p>
          <button className={`row full`} style={{ background: 'var(--card2)' }} onClick={() => setAlsoDelete(!alsoDelete)}><span>Also delete my posts in this crew</span><span className={`tag ${alsoDelete ? 'warn' : ''}`}>{alsoDelete ? 'Yes' : 'No'}</span></button>
          <button className="danger" onClick={() => void leave(leaving, alsoDelete)}>Yes, leave crew</button>
          <button className="ghost" onClick={() => { setLeaving(null); setAlsoDelete(false) }}>Stay</button>
        </Sheet>
      )}
    </>
  )
}
export const sampleName = (id: string) => NAMES[Array.from(id).reduce((a, c) => a + c.charCodeAt(0), 0) % NAMES.length]
