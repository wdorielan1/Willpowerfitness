import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../store'
import SocialTabs from '../SocialTabs'
import { CHALLENGES, instanceFor, instanceFromCohort, scoreFor, type Instance } from '../challenges'
import { cloudEnabled, pushScore, useLeaderboard } from '../cloud'
import { fromISO, todayISO } from '../engine'

const md = (s: string) => fromISO(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

/** Keeps your score in every challenge you joined up to date (runs while the app is open). */
export function ChallengeSync() {
  const { data, userId } = useApp()
  const last = useRef<Record<string, number>>({})
  useEffect(() => {
    if (!userId) return
    const t = setTimeout(() => {
      const today = todayISO()
      for (const cohort of data.challengesJoined) {
        const inst = instanceFromCohort(cohort)
        if (!inst || inst.end < today) continue
        const score = scoreFor(inst, data, today)
        if (last.current[cohort] !== score) { last.current[cohort] = score; void pushScore(cohort, userId, data.name || 'Member', score) }
      }
    }, 1500)
    return () => clearTimeout(t)
  }, [data, userId])
  return null
}

function Card({ inst }: { inst: Instance }) {
  const { data, update, userId } = useApp()
  const today = todayISO()
  const joined = data.challengesJoined.includes(inst.cohort)
  const mine = scoreFor(inst, data, today)
  const board = useLeaderboard(joined ? inst.cohort : null, userId)
  const join = () => {
    update((d) => ({ ...d, challengesJoined: [...d.challengesJoined, inst.cohort] }))
    if (userId) void pushScore(inst.cohort, userId, data.name || 'Member', mine)
  }
  return (
    <section className={`card ${joined ? 'hero' : ''}`}>
      <div className="row"><h2>{inst.def.emoji} {inst.def.name}</h2><span className="tag accent">{inst.daysLeft} day{inst.daysLeft === 1 ? '' : 's'} left</span></div>
      <p>{inst.def.blurb}</p>
      <div className="small mute">{md(inst.start)} to {md(inst.end)}</div>
      {joined ? (
        <>
          <div className="stat"><b>{mine.toLocaleString()}</b><span>your {inst.def.unit} so far</span></div>
          {cloudEnabled ? (
            board.length ? (
              <div className="people">{board.slice(0, 10).map((r, i) => <div className="person" key={r.userId}><span className="avatar">{i + 1}</span><span className="grow">{r.mine ? `${r.name} (you)` : r.name}</span><b>{Math.round(r.score).toLocaleString()}</b></div>)}</div>
            ) : <p className="small mute">You’re the first one in. Invite friends and set the pace.</p>
          ) : <p className="small mute">Leaderboards fill in once the live backend is connected.</p>}
          {inst.def.metric === 'steps' && <Link to="/log?t=steps" className="btn ghost">Log today’s steps</Link>}
        </>
      ) : <button className="primary" onClick={join}>Join this challenge</button>}
      <details><summary className="small mute" style={{ cursor: 'pointer' }}>How it works</summary><p className="small" style={{ marginTop: 6 }}>{inst.def.rules}</p></details>
    </section>
  )
}

export default function Challenges() {
  const today = todayISO()
  return (
    <>
      <SocialTabs />
      <div><h1>Challenges</h1><p className="mute">Compete with everyone in the same round. New rounds start on a schedule, so it’s always fair.</p></div>
      {CHALLENGES.map((c) => <Card key={c.id} inst={instanceFor(c, today)} />)}
      <section className="card">
        <span className="tag">Coming later</span>
        <h3>Paid challenges</h3>
        <p className="small mute">30-Day Accountability Challenge and the 6-Week Fat Loss Challenge, with coaching and prizes. These are not live yet. Everything above is free.</p>
      </section>
    </>
  )
}
