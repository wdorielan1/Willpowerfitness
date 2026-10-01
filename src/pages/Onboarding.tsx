import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Logo } from '../App'
import { useApp } from '../store'
import { todayISO } from '../engine'
import { joinCrewCloud } from '../cloud'
import { DAY_NAMES, GOALS, LEVELS, COMMUNITIES } from '../data'
import type { Gear, Goal, Level, Profile } from '../types'

const empty: Profile = {
  goal: 'muscle_gain', level: 'intermediate', days: [1, 2, 4, 5, 6], style: 'hypertrophy', gear: 'gym',
  weight: 180, target: 175, time: '06:00', cardio: true, avoid: '', reminders: true, wantsCommunity: true,
}

export default function Onboarding() {
  const { data, update, userId } = useApp()
  const nav = useNavigate()
  const [p, setP] = useState<Profile>(empty)
  const [step, setStep] = useState(0)
  const [pick, setPick] = useState<string | null>(null)
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((x) => ({ ...x, [k]: v }))
  const toggleDay = (i: number) => set('days', p.days.includes(i) ? p.days.filter((d) => d !== i) : [...p.days, i].sort())

  const finish = () => {
    const best = COMMUNITIES.find((c) => c.time === p.time) ?? COMMUNITIES[0]
    const chosen = p.wantsCommunity ? pick ?? best.id : null
    update((d) => ({
      ...d, profile: p, joined: chosen ? [chosen] : [], primary: chosen,
      weights: [...d.weights, { date: todayISO(), lbs: p.weight }].slice(-1),
    }))
    if (userId && chosen) void joinCrewCloud(chosen, userId, data.name || 'Member', 0)
    nav('/')
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
        <label>Current weight (lb)<input type="number" inputMode="decimal" value={p.weight} onChange={(e) => set('weight', Number(e.target.value))} /></label>
        <label>Target weight (lb)<input type="number" inputMode="decimal" value={p.target} onChange={(e) => set('target', Number(e.target.value))} /></label>
      </div>
      <Toggle label="Include cardio" on={p.cardio} onClick={() => set('cardio', !p.cardio)} />
      <Toggle label="Send me accountability reminders" on={p.reminders} onClick={() => set('reminders', !p.reminders)} />
      <Toggle label="Join a workout community" on={p.wantsCommunity} onClick={() => set('wantsCommunity', !p.wantsCommunity)} />
    </>,
    <>
      <h2>Pick your crew</h2>
      <p className="mute">You will not train alone, even when you are physically alone.</p>
      {COMMUNITIES.slice(0, 7).map((c) => (
        <button key={c.id} className={`card full ${(pick ?? COMMUNITIES.find((x) => x.time === p.time)?.id) === c.id ? 'hero' : ''}`} style={{ textAlign: 'left', justifyContent: 'flex-start' }} onClick={() => setPick(c.id)}>
          <span><b>{c.name}</b><br /><span className="small mute">{c.vibe} · {c.members} members</span></span>
        </button>
      ))}
    </>,
  ]
  const last = step === (p.wantsCommunity ? 3 : 2)

  return (
    <div className="auth" style={{ alignContent: 'start' }}>
      <div className="row"><div className="brand" style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Logo size={34} /><b>Hey {data.name || 'there'}</b></div><span className="tag">{step + 1} / {p.wantsCommunity ? 4 : 3}</span></div>
      <div className="card">{steps[step]}</div>
      <div className="row">
        {step > 0 ? <button className="ghost" onClick={() => setStep(step - 1)}>Back</button> : <span />}
        {last ? <button className="primary" onClick={finish}>Start showing up</button> : <button className="primary" onClick={() => setStep(step + 1)}>Next</button>}
      </div>
    </div>
  )
}

function Toggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return <button className="row full" style={{ background: 'var(--card2)' }} onClick={onClick}><span>{label}</span><span className={`tag ${on ? 'ok' : ''}`}>{on ? 'Yes' : 'No'}</span></button>
}
