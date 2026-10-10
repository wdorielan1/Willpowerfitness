import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Logo } from '../App'
import { useApp } from '../store'
import { todayISO } from '../engine'
import { withTimeout } from '../photos'
import { followCloud, handleToUser, joinCrewCloud } from '../cloud'
import { allCommunities } from './Crew'
import { DAY_NAMES, GOALS, LEVELS, COMMUNITIES, type CommunityDef } from '../data'
import { suggestCrews } from '../matching'
import MatchQuestions from '../MatchQuestions'
import { fmtTime } from '../engine'
import type { Gear, Goal, Level, Profile } from '../types'

const empty: Profile = {
  goal: 'muscle_gain', level: 'intermediate', days: [1, 2, 4, 5, 6], style: 'hypertrophy', gear: 'gym',
  weight: 180, target: 175, time: '06:00', cardio: true, avoid: '', reminders: true, wantsCommunity: true,
}

export default function Onboarding() {
  const { data, saveAccount, userId } = useApp()
  const nav = useNavigate()
  const [p, setP] = useState<Profile>(empty)
  const [step, setStep] = useState(0)
  const [pick, setPick] = useState<string | undefined>(undefined) // undefined = top match, 'solo' = no crew
  const [more, setMore] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const pending = useRef(false)
  // keep what's typed as text so the box can be emptied and retyped (a number state turns '' into 0)
  const [wText, setWText] = useState(String(empty.weight))
  const [tText, setTText] = useState(String(empty.target))
  const num = (t: string, fallback: number) => { const n = parseFloat(t); return n > 0 ? n : fallback }
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((x) => ({ ...x, [k]: v }))
  const toggleDay = (i: number) => set('days', p.days.includes(i) ? p.days.filter((d) => d !== i) : [...p.days, i].sort())

  const invite = (() => { try { return JSON.parse(localStorage.getItem('wpf.invite') ?? 'null') as { ref?: string | null; crew?: string | null } | null } catch { return null } })()
  const invitedCrew = invite?.crew ? allCommunities(data.custom).find((c) => c.id === invite.crew) : undefined
  const base = suggestCrews(p, COMMUNITIES as CommunityDef[])
  const sugg = invitedCrew ? [{ crew: invitedCrew, score: 99, reasons: ['A friend invited you'] }, ...base.filter((s) => s.crew.id !== invitedCrew.id)] : base
  const finish = async () => {
    if (pending.current) return
    pending.current = true; setSaving(true); setError('')
    const chosen = p.wantsCommunity && pick !== 'solo' ? pick ?? sugg[0]?.crew.id ?? null : null
    try {
      if (userId && chosen) {
        const membershipError = await withTimeout(joinCrewCloud(chosen, userId, data.name || 'Member', 0), 15000, 'Joining your crew')
        if (membershipError) throw new Error(membershipError)
      }
      const saveError = await saveAccount((d) => ({
        ...d, profile: p, joined: chosen ? [...new Set([...d.joined, chosen])] : d.joined, primary: chosen,
        weights: [...d.weights.filter((entry) => entry.date !== todayISO()), { date: todayISO(), lbs: p.weight }],
      }))
      if (saveError) throw new Error(saveError)
      if (userId && invite?.ref) void handleToUser(invite.ref).then((id) => { if (id && id !== userId) void followCloud(userId, id) }).catch(() => {})
      try { localStorage.removeItem('wpf.invite') } catch { /* ignore */ }
      nav('/')
    } catch (caught) {
      setError(`Could not finish setup: ${caught instanceof Error ? caught.message : String(caught)}. Your answers are still here; try again.`)
    } finally { pending.current = false; setSaving(false) }
  }

  const steps = [
    <>
      <h2>What are you training for?</h2>
      <div className="chips">
        {(Object.keys(GOALS) as Goal[]).map((g) => <button key={g} className={`chip ${p.goal === g ? 'on' : ''}`} onClick={() => set('goal', g)}>{GOALS[g]}</button>)}
      </div>
      <h3>Experience</h3>
      <div className="chips">
        {(Object.keys(LEVELS) as Level[]).map((l) => <button key={l} className={`chip ${p.level === l ? 'on' : ''}`} onClick={() => set('level', l)}>{LEVELS[l]}</button>)}
      </div>
      <h3>Training style</h3>
      <div className="chips">
        {([['hypertrophy', 'Bodybuilding'], ['strength', 'Strength'], ['mixed', 'Mixed']] as const).map(([k, l]) => <button key={k} className={`chip ${p.style === k ? 'on' : ''}`} onClick={() => set('style', k)}>{l}</button>)}
      </div>
    </>,
    <>
      <h2>Your schedule</h2>
      <h3>Training days</h3>
      <div className="chips">
        {DAY_NAMES.map((n, i) => <button key={n} className={`chip ${p.days.includes(i) ? 'on' : ''}`} onClick={() => toggleDay(i)}>{n}</button>)}
      </div>
      <label>Preferred workout time<input type="time" value={p.time} onChange={(e) => set('time', e.target.value)} /></label>
      <h3>Equipment</h3>
      <div className="chips">
        {([['gym', 'Full gym'], ['db', 'Dumbbells only'], ['bw', 'Bodyweight']] as [Gear, string][]).map(([k, l]) => <button key={k} className={`chip ${p.gear === k ? 'on' : ''}`} onClick={() => set('gear', k)}>{l}</button>)}
      </div>
      <label>Injuries or exercises to avoid (comma separated)<input value={p.avoid} onChange={(e) => set('avoid', e.target.value)} placeholder="e.g. shoulder, lunge" /></label>
    </>,
    <>
      <h2>Your numbers</h2>
      <div className="grid2">
        <label>Current weight (lb)<input inputMode="decimal" value={wText} onChange={(e) => { const v = e.target.value.replace(/[^0-9.]/g, ''); setWText(v); set('weight', num(v, p.weight)) }} /></label>
        <label>Target weight (lb)<input inputMode="decimal" value={tText} onChange={(e) => { const v = e.target.value.replace(/[^0-9.]/g, ''); setTText(v); set('target', num(v, p.target)) }} /></label>
      </div>
      <Toggle label="Include cardio" on={p.cardio} onClick={() => set('cardio', !p.cardio)} />
      <Toggle label="Send me accountability reminders" on={p.reminders} onClick={() => set('reminders', !p.reminders)} />
      <Toggle label="Join a workout community" on={p.wantsCommunity} onClick={() => set('wantsCommunity', !p.wantsCommunity)} />
    </>,
    <>
      <h2>Help us find your crew</h2>
      <p className="mute small">Three quick, optional questions. We use them to suggest people like you. Skip anything you want.</p>
      <MatchQuestions p={p} onChange={(patch) => setP((x) => ({ ...x, ...patch }))} />
    </>,
    <>
      <h2>Your best matches</h2>
      <p className="mute small">Based on your answers. Pick one to start, or go solo. You can change this anytime.</p>
      {sugg.slice(0, more ? 8 : 3).map((s, i) => {
        const on = (pick ?? sugg[0]?.crew.id) === s.crew.id
        return (
          <button key={s.crew.id} className={`card full ${on ? 'hero' : ''}`} style={{ textAlign: 'left', justifyContent: 'flex-start', display: 'grid' }} onClick={() => setPick(s.crew.id)}>
            <div className="row"><b>{s.crew.name}</b>{i === 0 && <span className="tag ok">Best match</span>}</div>
            <span className="small mute">{s.crew.vibe} · {fmtTime(s.crew.time)} · {s.crew.members} members</span>
            <span className="chips">{s.reasons.map((r) => <span key={r} className="tag">{r}</span>)}</span>
          </button>
        )
      })}
      {sugg.length > 3 && !more && <button className="ghost" onClick={() => setMore(true)}>Show a few more</button>}
      <button className={`chip ${pick === 'solo' ? 'on' : ''}`} style={{ justifySelf: 'start' }} onClick={() => setPick('solo')}>Skip, I’ll train solo for now</button>
    </>,
  ]
  const total = p.wantsCommunity ? 5 : 3
  const last = step === total - 1

  return (
    <div className="auth" style={{ alignContent: 'start' }}>
      <div className="row"><div className="brand" style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Logo size={34} /><b>Hey {data.name || 'there'}</b></div><span className="tag">{step + 1} / {total}</span></div>
      <div className="card">{steps[step]}</div>
      {error && <p className="err" role="alert">{error}</p>}
      <div className="row">
        {step > 0 ? <button className="ghost" disabled={saving} onClick={() => setStep(step - 1)}>Back</button> : <span />}
        {last ? <button className="primary" disabled={saving} onClick={() => void finish()}>{saving ? 'Saving setup…' : 'Start showing up'}</button> : <button className="primary" onClick={() => setStep(step + 1)}>Next</button>}
      </div>
    </div>
  )
}

function Toggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return <button className="row full" style={{ background: 'var(--card2)' }} onClick={onClick}><span>{label}</span><span className={`tag ${on ? 'ok' : ''}`}>{on ? 'Yes' : 'No'}</span></button>
}
