import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../store'
import { useCheckin } from '../actions'
import { CAT_LABEL, GOALS, type CommunityDef, type CrewCat } from '../data'
import { suggestCrews } from '../matching'
import MatchQuestions from '../MatchQuestions'
import SocialTabs from '../SocialTabs'
import { Sheet } from '../components'
import { fmtTime, streak, todayISO } from '../engine'
import { allCommunities } from './Crew'
import { INACTIVE_DAYS, cloudEnabled, createCrewCloud, deleteMyPostsCloud, joinCrewCloud, leaveCrewCloud, pushCheckin, useCrewCounts, useLiveCrew } from '../cloud'
import Qotd from './Qotd'
import Feed from './Feed'
import { postPhotos, deletePhotoBlob, CREW_BUCKET, withTimeout } from '../photos'
import { Icon } from '../icons'

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
  const [checkingIn, setCheckingIn] = useState(false)
  const [checkinError, setCheckinError] = useState('')
  const [checkinOverrides, setCheckinOverrides] = useState<Record<string, boolean>>({})
  const checkinPending = useRef(false)
  const today = todayISO()
  const completedToday = ci.done || data.logs.some((log) => log.date === today && !log.baseline && !log.skipped)

  // Keep the just-saved state visible while the live roster refreshes, then use live data again.
  const remoteCheckedIn = live?.people.some((person) => person.mine) ?? false
  useEffect(() => {
    if (!cloudEnabled || !crew || checkinOverrides[crew.id] === undefined || checkinOverrides[crew.id] !== remoteCheckedIn) return
    setCheckinOverrides((current) => {
      const next = { ...current }
      delete next[crew.id]
      return next
    })
  }, [crew?.id, remoteCheckedIn, checkinOverrides])

  // A user-made crew with no activity for 35 days is archived. Its posts and history are kept, and any new activity wakes it up.
  const isCustom = (c: CommunityDef) => data.custom.some((x) => x.id === c.id)
  const archived = (c: CommunityDef) => {
    if (!cloudEnabled || !isCustom(c)) return false
    const created = data.custom.find((x) => x.id === c.id)?.created ?? Date.now()
    const last = counts[c.id]?.lastActive ?? created
    return Date.now() - last > INACTIVE_DAYS * 86400000
  }
  const memberLabel = (c: CommunityDef) => {
    if (!cloudEnabled) return 'Local crew'
    const count = counts[c.id]?.members
    return count === undefined ? 'Member count loading' : `${count} member${count === 1 ? '' : 's'}`
  }
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
  const checkIn = async () => {
    if (!crew || checkinPending.current || completedToday) return
    const going = !checkedIn
    checkinPending.current = true
    setCheckingIn(true)
    setCheckinError('')
    try {
      if (userId) {
        const error = await pushCheckin(crew.id, userId, myName, { going, done: false }, streak(data))
        if (error) throw new Error(error)
      }
      // A check-in is a plan, so changing it never deletes sets, workout logs, or completion.
      update((d) => ({ ...d, checkins: { ...d.checkins, [today]: { ...d.checkins[today], going } } }))
      if (cloudEnabled) setCheckinOverrides((current) => ({ ...current, [crew.id]: going }))
      live?.refresh()
    } catch (error) {
      setCheckinError(error instanceof Error ? error.message : String(error))
    } finally {
      checkinPending.current = false
      setCheckingIn(false)
    }
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
              <div className="row"><span className="small mute">{memberLabel(s.crew)}</span><button className="primary small-btn" onClick={() => join(s.crew)}>Join</button></div>
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
              <div className="row"><span className="small mute">{memberLabel(c)}</span><button className="primary small-btn" onClick={() => join(c)}>Join</button></div>
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
  const remotePeople = crew
    ? cloudEnabled && live
      ? live.people.map((x) => ({ ...x, name: x.mine ? `${x.name} (you)` : x.name }))
      : ci.going ? [{ name: `${myName} (you)`, status: ci.done ? 'done' as const : 'going' as const, streak: streak(data), mine: true }] : []
    : []
  const board = crew
    ? (cloudEnabled && live ? live.board.map((r) => ({ name: r.mine ? `${r.name} (you)` : r.name, streak: r.streak })) : [{ name: `${myName} (you)`, streak: streak(data) }])
        .sort((a, b) => b.streak - a.streak).slice(0, 6)
    : []
  const checkedInDone = completedToday || remotePeople.some((p) => p.mine && p.status === 'done')
  const checkedIn = checkedInDone || (crew && cloudEnabled && checkinOverrides[crew.id] !== undefined
    ? checkinOverrides[crew.id]
    : cloudEnabled ? remotePeople.some((p) => p.mine) || (crew?.id === data.primary && ci.going) : ci.going)
  const ownPerson = remotePeople.find((p) => p.mine)
  const people = [...remotePeople.filter((p) => !p.mine), ...(checkedIn ? [{ name: ownPerson?.name ?? `${myName} (you)`, status: checkedInDone ? 'done' as const : 'going' as const, streak: streak(data), mine: true }] : [])]

  return (
    <>
      {!cloudEnabled && <div className="banner">Local mode. Your check-ins and posts are saved on this device. Connect live crews to see other members.</div>}

      {!crew ? (
        <>
          <header className="crew-heading"><div className="overline">YOUR CREW</div><h1 className="crew-title">Find your people.</h1><p className="small mute">Join a crew around your training time, goals, or routine. You can be in up to {MAX_CREWS}.</p></header>
          <SocialTabs />
          {Finder}
        </>
      ) : (
        <>
          <div className="crew-switcher">
            {yours.length > 1 && <div className="chips" aria-label="Your crews">{yours.map((c) => <button key={c.id} className={`chip ${c.id === crew.id ? 'on' : ''}`} aria-pressed={c.id === crew.id} onClick={() => setSel(c.id)}>{c.name}</button>)}</div>}
            <div className="row"><span className="small mute">{yours.length} of {MAX_CREWS} crews</span><button className="quiet-action" onClick={() => setFinder(true)}><Icon name="plus" size={15} /> Find crews</button></div>
          </div>
          <header className="crew-heading">
            <div className="overline">{!crew.cat || crew.cat === 'time' ? 'TIME-BASED CREW' : `${CAT_LABEL[crew.cat]} CREW`}</div>
            <h1 className="crew-title">{crew.name}</h1>
            <div className="crew-meta"><span><Icon name="clock" size={16} /> {fmtTime(crew.time)} training time</span>{cloudEnabled && cc && <><span>{cc.members} member{cc.members === 1 ? '' : 's'}</span><span>{cc.done} done today</span></>}</div>
            {archived(crew) && <div className="banner">This crew has been quiet for {INACTIVE_DAYS}+ days. Post something to wake it up.</div>}
          </header>
          <SocialTabs />

          <Qotd key={crew.id} crewId={crew.id} />

          <section className="crew-streaks card">
            <div className="section-heading"><h2>Streak leaderboard</h2><Icon name="chart" size={19} /></div>
            {board.length === 0 ? <p className="small mute">Member streaks will appear here.</p> : <div className="people">
              {board.map((r, i) => <div className="person crew-streak-row" key={`${r.name}-${i}`}><span className="avatar">{i + 1}</span><span className="grow">{r.name}</span><span className="small">{r.streak} day{r.streak === 1 ? '' : 's'}</span></div>)}
            </div>}
          </section>

          <section className="crew-goals card">
            <div className="section-heading"><h2>Crew goals</h2><Icon name="weight" size={19} /></div>
            {!!crew.goals?.length && <div className="chips">{crew.goals.map((goal) => <span className="tag" key={goal}>{GOALS[goal]}</span>)}</div>}
            <p className="small mute">Pick a challenge to work toward with your crew.</p>
            <Link className="crew-goal-link quiet-action" to="/challenges">View challenges <Icon name="arrow" size={16} /></Link>
          </section>

          <section className="crew-checkin card">
            <div className="section-heading"><h2>Training today</h2><Icon name="crew" size={19} /></div>
            {people.length === 0 ? <p className="small mute">No check-ins to show yet.</p> : <div className="crew-activity people">
              {people.map((r, i) => <div className="person" key={`${r.name}-${i}`}><span className={`avatar ${r.status}`}>{r.name[0]}</span><span className="grow">{r.name}</span><span className={`tag ${r.status === 'done' ? 'ok' : 'accent'}`}>{r.status === 'done' ? 'Done' : 'Training'}</span></div>)}
            </div>}
            <button className="checkin-button" aria-pressed={checkedIn} disabled={checkedInDone || checkingIn} onClick={() => void checkIn()}><Icon name={checkedIn ? 'check' : 'plus'} size={16} />{checkingIn ? 'Saving…' : checkedInDone ? 'Workout done' : checkedIn ? 'Cancel check-in' : 'I’m training today'}</button>
            {checkedIn && !checkedInDone && <p className="small mute checkin-note">You’re training today. Tap again if your plans change.</p>}
            {checkedInDone && <p className="small mute checkin-note">Your completed workout stays checked in.</p>}
            {checkinError && <p className="err" role="alert">{checkinError}</p>}
          </section>

          <Feed key={crew.id} crewId={crew.id} />

          <details className="crew-optional card"><summary>About this crew</summary><p className="small mute">{crew.vibe}</p>{crew.blurb && <p className="small mute">{crew.blurb}</p>}{cloudEnabled && cc && <p className="small mute">{cc.active} active in the last {INACTIVE_DAYS} days.</p>}</details>

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
