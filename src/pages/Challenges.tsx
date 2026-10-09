import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useApp } from '../store'
import SocialTabs from '../SocialTabs'
import { CHALLENGES, METRIC_LABELS, METRIC_UNITS, customInstance, instanceFor, instanceFromCohort, scoreFor, type Instance } from '../challenges'
import { cloudEnabled, createChallengeCloud, fetchChallengeById, fetchPublicChallenges, pushScore, useLeaderboard } from '../cloud'
import { addDays, fromISO, todayISO } from '../engine'
import { Sheet } from '../components'
import type { CustomChallenge, Metric } from '../types'

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
        const inst = instanceFromCohort(cohort, data.customChallenges)
        if (!inst || inst.end < today) continue
        const score = scoreFor(inst, data, today)
        if (last.current[cohort] !== score) { last.current[cohort] = score; void pushScore(cohort, userId, data.name || 'Member', score) }
      }
    }, 1500)
    return () => clearTimeout(t)
  }, [data, userId])
  return null
}

function Card({ inst, cc }: { inst: Instance; cc?: CustomChallenge }) {
  const { data, update, userId } = useApp()
  const today = todayISO()
  const joined = data.challengesJoined.includes(inst.cohort)
  const mine = scoreFor(inst, data, today)
  const board = useLeaderboard(joined ? inst.cohort : null, userId)
  const join = () => {
    update((d) => ({ ...d, challengesJoined: [...d.challengesJoined, inst.cohort], customChallenges: cc && !d.customChallenges.some((x) => x.id === cc.id) ? [...d.customChallenges, cc] : d.customChallenges }))
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
      {cc && <button className="ghost" onClick={() => { const link = `${location.origin}${location.pathname}#/challenges?join=${cc.id}`; if (navigator.share) void navigator.share({ title: cc.name, text: `Join my challenge on Will Power Fitness: ${cc.name}`, url: link }).catch(() => {}); else void navigator.clipboard?.writeText(link).then(() => alert('Invite link copied')) }}>Invite friends</button>}
      <details><summary className="small mute" style={{ cursor: 'pointer' }}>How it works</summary><p className="small" style={{ marginTop: 6 }}>{inst.def.rules}</p></details>
    </section>
  )
}

const EMOJIS = ['🏆', '🔥', '💪', '🏃', '⏰', '👟', '🚴', '🥇']

function CreateSheet({ onClose }: { onClose: () => void }) {
  const { data, update, userId } = useApp()
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('🏆')
  const [metric, setMetric] = useState<Metric>('workouts')
  const [start, setStart] = useState(todayISO())
  const [days, setDays] = useState(14)
  const [pub, setPub] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const save = async () => {
    if (name.trim().length < 3) { setErr('Give it a name (3+ characters).'); return }
    setBusy(true)
    const cc: CustomChallenge = { id: Math.random().toString(36).slice(2, 10), name: name.trim().slice(0, 40), emoji, metric, unit: METRIC_UNITS[metric], start, end: addDays(start, days - 1), mine: true }
    if (userId) { const e = await createChallengeCloud(cc, userId, pub); if (e) { setErr(`Couldn’t save: ${e}`); setBusy(false); return } }
    update((d) => ({ ...d, customChallenges: [...d.customChallenges, cc], challengesJoined: [...d.challengesJoined, `custom:${cc.id}`] }))
    setBusy(false); onClose()
  }
  return (
    <Sheet onClose={onClose} title="Create a challenge">
      <label className="field"><span>Name</span><input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="Office Step-Off" /></label>
      <div className="chips">{EMOJIS.map((e) => <button key={e} className={`chip ${emoji === e ? 'on' : ''}`} onClick={() => setEmoji(e)}>{e}</button>)}</div>
      <label className="field"><span>What counts</span><select value={metric} onChange={(e) => setMetric(e.target.value as Metric)}>{(Object.keys(METRIC_LABELS) as Metric[]).map((m) => <option key={m} value={m}>{METRIC_LABELS[m]}</option>)}</select></label>
      <label className="field"><span>Starts</span><input type="date" value={start} min={todayISO()} onChange={(e) => setStart(e.target.value || todayISO())} /></label>
      <div className="chips">{[7, 14, 30].map((n) => <button key={n} className={`chip ${days === n ? 'on' : ''}`} onClick={() => setDays(n)}>{n} days</button>)}</div>
      {cloudEnabled && <label className="row small"><input type="checkbox" checked={pub} onChange={(e) => setPub(e.target.checked)} /> <span>List it publicly so anyone can find it (otherwise only people with your link can join)</span></label>}
      {err && <p className="small" style={{ color: 'var(--bad, #ff6b6b)' }}>{err}</p>}
      <button className="primary" disabled={busy} onClick={save}>Create challenge</button>
    </Sheet>
  )
}

export default function Challenges() {
  const today = todayISO()
  const { data } = useApp()
  const [params, setParams] = useSearchParams()
  const [open, setOpen] = useState(false)
  const [pubList, setPubList] = useState<CustomChallenge[]>([])
  const [linked, setLinked] = useState<CustomChallenge | null>(null)
  const joinId = params.get('join')
  useEffect(() => { void fetchPublicChallenges(today).then(setPubList) }, [today])
  useEffect(() => {
    if (!joinId) return
    const have = data.customChallenges.find((c) => c.id === joinId)
    if (have) setLinked(have); else void fetchChallengeById(joinId).then(setLinked)
  }, [joinId]) // eslint-disable-line react-hooks/exhaustive-deps
  const mineIds = new Set(data.customChallenges.map((c) => c.id))
  const joinedCustom = data.customChallenges.filter((c) => c.end >= today && data.challengesJoined.includes(`custom:${c.id}`))
  const others = pubList.filter((c) => !mineIds.has(c.id) && c.id !== linked?.id)
  return (
    <>
      <SocialTabs />
      <div><h1>Challenges</h1><p className="mute">Compete with everyone in the same round. New rounds start on a schedule, so it’s always fair.</p></div>
      <button className="primary" onClick={() => setOpen(true)}>＋ Create a challenge</button>
      {linked && (
        <>
          <p className="small mute">You were invited to this one:</p>
          <Card inst={customInstance(linked, today)} cc={linked} />
          <button className="ghost" onClick={() => { setLinked(null); setParams({}) }}>Dismiss</button>
        </>
      )}
      {joinedCustom.length > 0 && <h3>Your challenges</h3>}
      {joinedCustom.filter((c) => c.id !== linked?.id).map((c) => <Card key={c.id} inst={customInstance(c, today)} cc={c} />)}
      {CHALLENGES.map((c) => <Card key={c.id} inst={instanceFor(c, today)} />)}
      {others.length > 0 && <h3>Community challenges</h3>}
      {others.map((c) => <Card key={c.id} inst={customInstance(c, today)} cc={c} />)}
      <section className="card">
        <span className="tag">Coming later</span>
        <h3>Paid challenges</h3>
        <p className="small mute">30-Day Accountability Challenge and the 6-Week Fat Loss Challenge, with coaching and prizes. These are not live yet. Everything above is free.</p>
      </section>
      {open && <CreateSheet onClose={() => setOpen(false)} />}
    </>
  )
}
