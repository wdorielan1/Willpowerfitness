import { useState } from 'react'
import { useApp } from '../store'
import { useCheckin } from '../actions'
import { ENCOURAGEMENTS, NAMES } from '../data'
import { fmtTime, todayISO } from '../engine'
import { allCommunities, roster, stats } from './Crew'
import type { Message } from '../types'
import { cloudEnabled, createCrewCloud, joinCrewCloud, leaveCrewCloud, postMessageCloud, useCrewCounts, useLiveCrew } from '../cloud'
import { streak } from '../engine'

export default function Communities() {
  const { data, update, userId } = useApp()
  const ci = useCheckin()
  const all = allCommunities(data.custom)
  const [open, setOpen] = useState<string | null>(data.primary)
  const [name, setName] = useState('')
  const [time, setTime] = useState('06:00')
  const [text, setText] = useState('')
  const crew = all.find((c) => c.id === open)
  const live = useLiveCrew(open, userId)
  const counts = useCrewCounts()
  const myName = data.name || 'You'

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
    update((d) => ({ ...d, custom: [...d.custom, { id, name: name.trim(), time, vibe: 'Time-based crew' }], joined: [...d.joined, id], primary: id }))
    if (userId) void createCrewCloud(id, userId, name.trim(), time).then(() => joinCrewCloud(id, userId, myName, streak(data)))
    setName(''); setOpen(id)
  }
  const post = (t: string) => {
    if (!t.trim() || !crew) return
    const m: Message = { id: String(Date.now()), community: crew.id, who: data.name || 'You', text: t.trim(), ts: Date.now(), mine: true }
    if (userId) void postMessageCloud(crew.id, userId, myName, t.trim()).then(() => live?.refresh())
    else update((d) => ({ ...d, messages: [m, ...d.messages] }))
    setText('')
  }

  return (
    <>
      <div><h1>Crew</h1><p className="mute">You are not going to the gym alone.</p></div>
      {!cloudEnabled && <div className="banner">Beta preview: member counts and teammates are sample data until live communities launch.</div>}

      {all.map((c) => {
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
                <h3>Encouragement</h3>
                <div className="chips">
                  {ENCOURAGEMENTS.slice(0, 3).map((m) => <button key={m} className="chip" onClick={() => post(m)}>{m}</button>)}
                </div>
                <div className="row"><input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message your crew" /><button className="primary" onClick={() => post(text)}>Send</button></div>
                <div className="people">
                  {(isLive ? live.messages.slice(0, 8) : data.messages.filter((m) => m.community === c.id).slice(0, 5)).map((m) => <div key={m.id} className="small"><b>{m.who}:</b> {m.text}</div>)}
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
      })}

      <section className="card">
        <h2>Start a time-based crew</h2>
        <p className="small mute">Pick a time (5 AM, 6 AM, 12 PM, 5:30 PM, 7 PM…) and rally people around it.</p>
        <label>Name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 5:45 AM Legs Crew" /></label>
        <label>Workout time<input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
        <button className="primary" onClick={create}>Create crew</button>
      </section>
    </>
  )
}
const hashIdx = (s: string) => Array.from(s).reduce((a, c) => a + c.charCodeAt(0), 0) % NAMES.length
