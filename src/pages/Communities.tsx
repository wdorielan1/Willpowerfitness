import { useState } from 'react'
import { useApp } from '../store'
import { useCheckin } from '../actions'
import { CAT_LABEL, ENCOURAGEMENTS, NAMES, type CommunityDef, type CrewCat } from '../data'
import { suggestCrews } from '../matching'
import MatchQuestions from '../MatchQuestions'
import { Sheet } from '../components'
import { fmtTime, todayISO } from '../engine'
import { allCommunities, roster, stats } from './Crew'
import type { Message } from '../types'
import { cloudEnabled, createCrewCloud, joinCrewCloud, leaveCrewCloud, postMessageCloud, useCrewCounts, useLiveCrew } from '../cloud'
import { streak } from '../engine'
import Qotd, { QOTD_PREFIX } from './Qotd'

export default function Communities() {
  const { data, update, userId } = useApp()
  const ci = useCheckin()
  const all = allCommunities(data.custom)
  const [open, setOpen] = useState<string | null>(data.primary)
  const [name, setName] = useState('')
  const [time, setTime] = useState('06:00')
  const [vibe, setVibe] = useState('')
  const [text, setText] = useState('')
  const crew = all.find((c) => c.id === open)
  const live = useLiveCrew(open, userId)
  const counts = useCrewCounts()
  const myName = data.name || 'You'
  const [showAll, setShowAll] = useState(false)
  const [cat, setCat] = useState<CrewCat | 'all'>('all')
  const [tune, setTune] = useState(false)
  const yours = all.filter((c) => data.joined.includes(c.id))
  const suggested = suggestCrews(data.profile!, all).filter((s) => !data.joined.includes(s.crew.id)).slice(0, 3)
  const browse = all.filter((c) => !data.joined.includes(c.id) && (cat === 'all' || (c.cat ?? 'time') === cat))
  const countOf = (c: CommunityDef) => (cloudEnabled ? counts[c.id]?.members ?? 0 : c.members)

  const join = (id: string) => {
    update((d) => ({ ...d, joined: d.joined.includes(id) ? d.joined : [...d.joined, id], primary: id }))
    if (userId) void joinCrewCloud(id, userId, myName, streak(data)).then(() => live?.refresh())
  }
  const leave = (id: string) => {
    if (userId) void leaveCrewCloud(id, userId)
    update((d) => {
    const joined = d.joined.filter((x) => x !== id)
    return { ...d, joined, primary: d.primary === id ? joined[0] ?? null : d.primary }
    })
  }
  const create = () => {
    if (!name.trim()) return
    const id = `c${Date.now()}`
    update((d) => ({ ...d, custom: [...d.custom, { id, name: name.trim(), time, vibe: vibe.trim() || 'Time-based crew' }], joined: [...d.joined, id], primary: id }))
    if (userId) void createCrewCloud(id, userId, name.trim(), time, vibe.trim() || 'Time-based crew').then(() => joinCrewCloud(id, userId, myName, streak(data)))
    setName(''); setVibe(''); setOpen(id)
  }
  const post = (t: string) => {
    if (!t.trim() || !crew) return
    const m: Message = { id: String(Date.now()), community: crew.id, who: data.name || 'You', text: t.trim(), ts: Date.now(), mine: true }
    if (userId) void postMessageCloud(crew.id, userId, myName, t.trim()).then(() => live?.refresh())
    else update((d) => ({ ...d, messages: [m, ...d.messages] }))
    setText('')
  }

  const renderCrew = (c: CommunityDef) => {
        const cc = counts[c.id] ?? { members: 0, done: 0 }
        const g = cloudEnabled
          ? { pct: cc.members ? Math.round((cc.done / cc.members) * 100) : 0, members: cc.members }
          : { ...stats(c, open === c.id && ci.done), members: c.members }
        const isLive = cloudEnabled && open === c.id && live
        const joined = data.joined.includes(c.id)
        return (
          <section key={c.id} className={`card ${data.primary === c.id ? 'hero' : ''}`}>
            <div className="row" onClick={() => setOpen(open === c.id ? null : c.id)} style={{ cursor: 'pointer' }}>
              <div><h2>{c.name}</h2><div className="small mute">{c.vibe}</div></div>
              <span className="tag accent">{fmtTime(c.time)}</span>
            </div>
            <div className="grid3">
              <div className="stat"><b>{g.members}</b><span>members</span></div>
              <div className="stat"><b>{g.pct}%</b><span>done today</span></div>
              <div className="stat"><b>{cloudEnabled ? '—' : `${Math.round(c.rate * 100)}%`}</b><span>{cloudEnabled ? 'live' : 'avg. rate'}</span></div>
            </div>
            {joined ? (
              <div className="grid2">
                <button className="ghost" onClick={() => setOpen(open === c.id ? null : c.id)}>{open === c.id ? 'Hide' : 'Open'}</button>
                {data.primary === c.id ? <button className="ghost" onClick={() => leave(c.id)}>Leave</button> : <button className="primary" onClick={() => join(c.id)}>Make primary</button>}
              </div>
            ) : <button className="primary" onClick={() => join(c.id)}>Join crew</button>}

            {open === c.id && joined && (
              <>
                <p className="small mute">{c.blurb}</p>
                <h3>Leaderboard · streaks</h3>
                <div className="people">
                  {(isLive ? live.board.map((r) => ({ name: r.mine ? `${r.name} (you)` : r.name, streak: r.streak })) : [...roster(c).map((r) => ({ name: r.name, streak: r.streak })), { name: `${data.name || 'You'} (you)`, streak: 0 }])
                    .sort((a, b) => b.streak - a.streak).slice(0, 6).map((r, i) => (
                      <div className="person" key={r.name}><span className="avatar">{i + 1}</span><span className="grow">{r.name}</span><b>🔥 {r.streak}</b></div>
                    ))}
                </div>
                <h3>Training today</h3>
                <div className="people">
                  {isLive && live.people.length === 0 && <span className="small mute">Nobody has checked in yet. Be the first.</span>}
                  {(isLive ? live.people.map((x) => ({ ...x, name: x.mine ? `${x.name} (you)` : x.name })) : roster(c, todayISO(), ci.going ? { name: data.name || 'You', going: true, done: ci.done } : undefined)).map((r) => (
                    <div className="person" key={r.name}><span className={`avatar ${r.status}`}>{r.name[0]}</span><span className="grow">{r.name}</span><span className={`tag ${r.status === 'done' ? 'ok' : 'accent'}`}>{r.status === 'done' ? 'Done' : 'Going'}</span></div>
                  ))}
                </div>
                <Qotd crewId={c.id} live={isLive ? live : null} />
                <h3>Encouragement</h3>
                <div className="chips">
                  {ENCOURAGEMENTS.slice(0, 3).map((m) => <button key={m} className="chip" onClick={() => post(m)}>{m}</button>)}
                </div>
                <div className="row"><input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message your crew" /><button className="primary" onClick={() => post(text)}>Send</button></div>
                <div className="people">
                  {(isLive ? live.messages.slice(0, 8) : data.messages.filter((m) => m.community === c.id).slice(0, 5)).map((m) => <div key={m.id} className="small"><b>{m.who}:</b> {m.text.replace(QOTD_PREFIX, '💬 ')}</div>)}
                  {!cloudEnabled && <div className="small mute"><b>{NAMES[hashIdx(c.id)]}:</b> Locked in for {fmtTime(c.time)}. Who’s with me?</div>}
                </div>
                {!cloudEnabled && <h3>Accountability partner</h3>}
                {!cloudEnabled && (data.partner
                  ? <div className="rec add_weight">Matched with <b>{NAMES[(hashIdx(c.id) + 3) % NAMES.length]}</b> · same time slot, similar goal. Check in on each other daily.</div>
                  : <button className="ghost" onClick={() => update((d) => ({ ...d, partner: true }))}>Match me with a partner (optional)</button>)}
              </>
            )}
          </section>
        )
  }

  return (
    <>
      <div className="row"><div><h1>Crew</h1><p className="mute">Optional. You can always train solo.</p></div><button className="primary small-btn" onClick={() => document.getElementById('new-crew')?.scrollIntoView({ behavior: 'smooth' })}>＋ New crew</button></div>
      {!cloudEnabled && <div className="banner">Beta preview: member counts and teammates are sample data until live communities launch.</div>}

      {yours.length > 0 ? (
        <>
          <h2>Your crews</h2>
          {yours.map(renderCrew)}
        </>
      ) : (
        <section className="card"><span className="tag">Solo mode</span><h3>You’re training on your own</h3><p className="small mute">That’s totally fine. Join a crew whenever you want company.</p></section>
      )}

      {suggested.length > 0 && (
        <>
          <div className="row"><h2>Suggested for you</h2><button className="ghost small-btn" onClick={() => setTune(true)}>Tune matches</button></div>
          {suggested.map((s) => (
            <section key={s.crew.id} className="card">
              <div className="row"><div><h3>{s.crew.name}</h3><div className="small mute">{s.crew.vibe}</div></div><span className="tag accent">{fmtTime(s.crew.time)}</span></div>
              <div className="chips">{s.reasons.map((r) => <span key={r} className="tag">{r}</span>)}</div>
              <div className="row"><span className="small mute">{countOf(s.crew)} members</span><button className="primary small-btn" onClick={() => join(s.crew.id)}>Join</button></div>
            </section>
          ))}
        </>
      )}

      <button className="ghost" onClick={() => setShowAll(!showAll)}>{showAll ? 'Hide all crews' : `Browse all crews (${all.length - yours.length})`}</button>
      {showAll && (
        <>
          <div className="chips">
            {(['all', 'time', 'goal', 'life', 'work', 'age'] as const).map((k) => <button key={k} className={`chip ${cat === k ? 'on' : ''}`} onClick={() => setCat(k)}>{k === 'all' ? 'All' : CAT_LABEL[k]}</button>)}
          </div>
          {browse.map((c) => (
            <section key={c.id} className="card">
              <div className="row"><div><h3>{c.name}</h3><div className="small mute">{c.vibe}</div></div><span className="tag accent">{fmtTime(c.time)}</span></div>
              <div className="row"><span className="small mute">{countOf(c)} members</span><button className="primary small-btn" onClick={() => join(c.id)}>Join</button></div>
            </section>
          ))}
          {browse.length === 0 && <p className="small mute">Nothing here. Try another filter.</p>}
        </>
      )}
      {tune && (
        <Sheet title="Tune your matches" onClose={() => setTune(false)}>
          <MatchQuestions p={data.profile!} onChange={(patch) => update((d) => ({ ...d, profile: { ...d.profile!, ...patch } }))} />
        </Sheet>
      )}

      <section className="card" id="new-crew">
        <h2>Start a new crew</h2>
        <p className="small mute">Pick a time (5 AM, 6 AM, 12 PM, 5:30 PM, 7 PM…) and rally people around it.</p>
        <label>Name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 5:45 AM Legs Crew" /></label>
        <label>Workout time<input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
        <label>Vibe (optional)<input value={vibe} onChange={(e) => setVibe(e.target.value)} placeholder="e.g. Heavy lifts, no excuses" /></label>
        <button className="primary" onClick={create}>Create crew</button>
      </section>
    </>
  )
}
const hashIdx = (s: string) => Array.from(s).reduce((a, c) => a + c.charCodeAt(0), 0) % NAMES.length
