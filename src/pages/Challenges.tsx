import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useApp } from '../store'
import SocialTabs from '../SocialTabs'
import { CHALLENGES, METRIC_LABELS, METRIC_UNITS, customInstance, instanceFor, instanceFromCohort, scoreFor, type Instance } from '../challenges'
import { cloudEnabled, createChallengeCloud, leaveChallengeCloud, fetchChallengeById, fetchPublicChallenges, pushScore, useLeaderboard } from '../cloud'
import { addDays, fromISO, todayISO } from '../engine'
import { ConfirmSheet, Sheet } from '../components'
import { Icon, type IconName } from '../icons'
import type { CustomChallenge, Metric } from '../types'

const md = (s: string) => fromISO(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
const metricIcon: Record<Metric, IconName> = { workouts: 'weight', earlyWorkouts: 'clock', steps: 'chart', cardioMin: 'clock', volume: 'weight' }

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

function Card({ inst, cc, onJoined }: { inst: Instance; cc?: CustomChallenge; onJoined?: () => void }) {
  const { data, update, userId } = useApp()
  const today = todayISO()
  const joined = data.challengesJoined.includes(inst.cohort)
  const mine = scoreFor(inst, data, today)
  const board = useLeaderboard(joined ? inst.cohort : null, userId)
  const [leaving, setLeaving] = useState(false)
  const [inviteStatus, setInviteStatus] = useState('')
  const [inviteFallback, setInviteFallback] = useState(false)
  const link = cc ? `${location.origin}${location.pathname}#/challenges?join=${cc.id}` : ''
  const join = () => {
    update((d) => ({ ...d, challengesJoined: d.challengesJoined.includes(inst.cohort) ? d.challengesJoined : [...d.challengesJoined, inst.cohort], customChallenges: cc && !d.customChallenges.some((x) => x.id === cc.id) ? [...d.customChallenges, cc] : d.customChallenges }))
    if (userId) void pushScore(inst.cohort, userId, data.name || 'Member', mine)
    onJoined?.()
  }
  const leave = () => {
    update((d) => ({ ...d, challengesJoined: d.challengesJoined.filter((c) => c !== inst.cohort) }))
    if (userId) void leaveChallengeCloud(inst.cohort, userId)
    setLeaving(false)
  }
  const invite = async () => {
    if (!cc) return
    setInviteStatus('')
    if (navigator.share) {
      try { await navigator.share({ title: cc.name, text: `Join my challenge on Wilpow: ${cc.name}`, url: link }); return }
      catch (error) { if (error instanceof DOMException && error.name === 'AbortError') return }
    }
    try { await navigator.clipboard.writeText(link); setInviteStatus('Invite link copied.') }
    catch { setInviteFallback(true); setInviteStatus('Copy this link to invite a friend.') }
  }
  const rules = inst.def.metric === 'steps' ? inst.def.rules.replace(' (Apple Health sync comes with the iPhone app)', '') : inst.def.rules
  return (
    <section className={`challenge-card${joined ? ' is-joined' : ''}`} aria-label={inst.def.name}>
      <div className="challenge-topline">
        <span className="challenge-mark"><Icon name={metricIcon[inst.def.metric]} /></span>
        <div className="challenge-title"><h2>{inst.def.name}</h2><p>{md(inst.start)} – {md(inst.end)}</p></div>
        {joined && <span className="challenge-joined"><Icon name="check" size={15} />Joined</span>}
      </div>
      <p className="challenge-description">{inst.def.blurb}</p>
      <div className="challenge-round"><span>{inst.start > today ? `Starts ${md(inst.start)}` : `${inst.daysLeft} ${inst.daysLeft === 1 ? 'day' : 'days'} left`}</span><span>{METRIC_UNITS[inst.def.metric]}</span></div>
      {joined ? <>
        <div className="challenge-score"><strong>{mine.toLocaleString()}</strong><span>Your {inst.def.unit} so far</span></div>
        <details className="challenge-leaderboard"><summary>Leaderboard<Icon name="chevron" size={16} /></summary>
          {cloudEnabled ? board.length ? <ol className="challenge-rankings">{board.slice(0, 10).map((r, i) => <li key={r.userId}><span className="challenge-rank">{i + 1}</span><span className="challenge-rank-name">{r.name}{r.mine ? ' (you)' : ''}</span><strong>{Math.round(r.score).toLocaleString()}</strong></li>)}</ol> : <p className="social-supporting">No leaderboard entries to show yet.</p> : <p className="social-supporting">Connect your account to see the shared leaderboard.</p>}
        </details>
        {inst.def.metric === 'steps' && <Link to="/log?t=steps" className="btn ghost challenge-log">Log today’s steps<Icon name="plus" size={17} /></Link>}
        <button className="quiet-action" onClick={() => setLeaving(true)}>Leave challenge</button>
      </> : <button className="ghost challenge-join" onClick={join}>Join challenge<Icon name="plus" size={18} /></button>}
      <div className="challenge-footer"><details className="challenge-rules"><summary>How it works<Icon name="chevron" size={15} /></summary><p>{rules}</p></details>{cc && <button className="quiet-action" onClick={() => void invite()}>Invite friends<Icon name="arrow" size={16} /></button>}</div>
      {inviteStatus && <p className="social-feedback" role="status">{inviteStatus}</p>}
      {leaving && <ConfirmSheet title={`Leave ${inst.def.name}?`} message="You’ll be removed from the leaderboard. Your workouts and steps stay saved, and you can rejoin while the challenge is running." confirmLabel="Leave challenge" onConfirm={leave} onCancel={() => setLeaving(false)} />}
      {inviteFallback && <input className="social-invite-url" value={link} readOnly aria-label="Challenge invite link" onFocus={(event) => event.currentTarget.select()} />}
    </section>
  )
}

function CreateSheet({ onClose }: { onClose: () => void }) {
  const { update, userId } = useApp()
  const [name, setName] = useState('')
  const [metric, setMetric] = useState<Metric>('workouts')
  const [start, setStart] = useState(todayISO())
  const [days, setDays] = useState(14)
  const [pub, setPub] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const save = async () => {
    if (busy) return
    if (name.trim().length < 3) { setErr('Give it a name (3+ characters).'); return }
    if (start < todayISO()) { setErr('Choose today or a future start date.'); return }
    setBusy(true); setErr('')
    // Keep the legacy field in saved records; the interface uses metric icons.
    const cc: CustomChallenge = { id: Math.random().toString(36).slice(2, 10), name: name.trim().slice(0, 40), emoji: '🏆', metric, unit: METRIC_UNITS[metric], start, end: addDays(start, days - 1), mine: true }
    try {
      if (userId) { const e = await createChallengeCloud(cc, userId, pub); if (e) { setErr(`Couldn’t save: ${e}`); return } }
      update((d) => ({ ...d, customChallenges: [...d.customChallenges, cc], challengesJoined: [...d.challengesJoined, `custom:${cc.id}`] }))
      onClose()
    } catch (error) { setErr(error instanceof Error ? error.message : 'Couldn’t save your challenge. Try again.') }
    finally { setBusy(false) }
  }
  return (
    <Sheet onClose={onClose} title="Create a challenge">
      <form className="challenge-create-form" noValidate onSubmit={(event) => { event.preventDefault(); void save() }}>
        <p className="social-supporting">Choose a goal and a finish date. Invite your people when it’s ready.</p>
        <label className="field"><span>Challenge name</span><input value={name} maxLength={40} onChange={(event) => setName(event.target.value)} placeholder="e.g. Lunch break steps" autoFocus /></label>
        <label className="field"><span>What counts</span><select value={metric} onChange={(event) => setMetric(event.target.value as Metric)}>{(Object.keys(METRIC_LABELS) as Metric[]).map((m) => <option key={m} value={m}>{METRIC_LABELS[m]}</option>)}</select></label>
        <label className="field"><span>Start date</span><input type="date" value={start} min={todayISO()} onChange={(event) => setStart(event.target.value || todayISO())} /></label>
        <fieldset className="challenge-duration"><legend>Duration</legend><div>{[7, 14, 30].map((n) => <button type="button" key={n} aria-pressed={days === n} onClick={() => setDays(n)}>{n} days</button>)}</div><p>Finishes {md(addDays(start, days - 1))}</p></fieldset>
        {cloudEnabled && <label className="challenge-public-control"><input type="checkbox" checked={pub} onChange={(event) => setPub(event.target.checked)} /><span><strong>Make it public</strong><span>Anyone can find it. Leave this off to invite by link.</span></span></label>}
        {err && <p className="err" role="alert">{err}</p>}
        <button type="submit" className="primary" disabled={busy}>{busy ? 'Creating…' : 'Create challenge'}<Icon name="arrow" size={19} /></button>
      </form>
    </Sheet>
  )
}

export default function Challenges() {
  const today = todayISO()
  const { data } = useApp()
  const [params, setParams] = useSearchParams()
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<'joined' | 'browse'>(data.challengesJoined.length ? 'joined' : 'browse')
  const [pubList, setPubList] = useState<CustomChallenge[]>([])
  const [linked, setLinked] = useState<CustomChallenge | null>(null)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const joinId = params.get('join')
  useEffect(() => { let alive = true; void fetchPublicChallenges(today).then((list) => { if (alive) setPubList(list) }); return () => { alive = false } }, [today])
  useEffect(() => {
    let alive = true
    setLinked(null); setInviteError('')
    if (!joinId) { setInviteLoading(false); return }
    const have = data.customChallenges.find((c) => c.id === joinId)
    if (have) { setLinked(have); setInviteLoading(false); return }
    setInviteLoading(true)
    void fetchChallengeById(joinId).then((found) => { if (alive) { setLinked(found); if (!found) setInviteError('This challenge is unavailable. Ask your friend for a new invite link.') } }).catch(() => { if (alive) setInviteError('Couldn’t open this invitation. Try the link again.') }).finally(() => { if (alive) setInviteLoading(false) })
    return () => { alive = false }
  }, [joinId, data.customChallenges])
  const mineIds = new Set(data.customChallenges.map((c) => c.id))
  const joinedCustom = data.customChallenges.filter((c) => c.end >= today && data.challengesJoined.includes(`custom:${c.id}`))
  const joinedStandard = CHALLENGES.map((c) => instanceFor(c, today)).filter((inst) => data.challengesJoined.includes(inst.cohort))
  const availableStandard = CHALLENGES.map((c) => instanceFor(c, today)).filter((inst) => !data.challengesJoined.includes(inst.cohort))
  const others = pubList.filter((c) => !mineIds.has(c.id) && c.id !== linked?.id)
  const joinedCount = joinedCustom.length + joinedStandard.length
  const dismissInvitation = () => { setLinked(null); setParams({}) }
  return (
    <>
      <SocialTabs />
      <div className="social-page-heading"><p className="overline">Shared goals</p><div className="social-title-row"><h1>Challenges</h1><button className="social-create-trigger" onClick={() => setOpen(true)} aria-label="Create challenge"><Icon name="plus" size={18} />Create</button></div><p>Pick a goal. Join a round. See how you do.</p></div>
      <div className="challenge-view-tabs" role="group" aria-label="Challenge lists"><button aria-pressed={view === 'joined'} onClick={() => setView('joined')} aria-label="Show joined challenges">Joined<span>{joinedCount}</span></button><button aria-pressed={view === 'browse'} onClick={() => setView('browse')} aria-label="Browse challenges">Browse</button></div>
      {joinId && <section className="challenge-invitation"><div className="section-head"><h2>You’re invited</h2><button className="quiet-action" onClick={dismissInvitation}>Dismiss</button></div>{inviteLoading && <p className="social-supporting" role="status">Opening invitation…</p>}{inviteError && <p className="err" role="alert">{inviteError}</p>}{linked && <Card inst={customInstance(linked, today)} cc={linked} onJoined={() => setView('joined')} />}</section>}
      {view === 'joined' ? <>
        {joinedCount === 0 && <section className="social-empty"><span className="icon-surface"><Icon name="chart" /></span><h2>Your next challenge starts here.</h2><p>Join a round to track your work against a shared goal.</p><button className="ghost" onClick={() => setView('browse')}>Browse challenges<Icon name="arrow" size={18} /></button></section>}
        {joinedCustom.filter((c) => c.id !== linked?.id).map((c) => <Card key={c.id} inst={customInstance(c, today)} cc={c} />)}
        {joinedStandard.map((inst) => <Card key={inst.cohort} inst={inst} />)}
      </> : <>
        <div className="section-head"><h2>Open rounds</h2><span>Free to join</span></div>
        {availableStandard.map((inst) => <Card key={inst.cohort} inst={inst} onJoined={() => setView('joined')} />)}
        {availableStandard.length === 0 && <p className="social-supporting">You’ve joined every current round. Your scores are under Joined.</p>}
        {others.length > 0 && <div className="section-head"><h2>Community challenges</h2></div>}
        {others.map((c) => <Card key={c.id} inst={customInstance(c, today)} cc={c} onJoined={() => setView('joined')} />)}
        <section className="challenge-future"><p className="overline">Planned for later</p><h2>Paid challenges</h2><p>Events with their own entry details are being developed. Paid entry is not available yet; the rounds above are free.</p></section>
      </>}
      {open && <CreateSheet onClose={() => { setOpen(false); setView('joined') }} />}
    </>
  )
}
