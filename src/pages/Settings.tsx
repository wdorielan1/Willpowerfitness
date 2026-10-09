import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../store'
import { DAY_NAMES, EXERCISES, GOALS, LEVELS, REST_PRESETS } from '../data'
import { fmtRest, restFor } from '../engine'
import MatchQuestions from '../MatchQuestions'
import type { Gear, Goal, Level, Profile, Settings as S } from '../types'

const num = (t: string, fallback: number) => { const n = parseFloat(t); return n > 0 ? n : fallback }

function Toggle({ label, hint, on, onClick }: { label: string; hint?: string; on: boolean; onClick: () => void }) {
  return (
    <button className="row full" style={{ background: 'var(--card2)', textAlign: 'left' }} onClick={onClick}>
      <span>{label}{hint && <><br /><span className="small mute">{hint}</span></>}</span>
      <span className={`tag ${on ? 'ok' : ''}`}>{on ? 'On' : 'Off'}</span>
    </button>
  )
}

export default function Settings() {
  const { data, update, email, logOut } = useApp()
  const p = data.profile!
  const s = data.settings
  const setP = <K extends keyof Profile>(k: K, v: Profile[K]) => update((d) => ({ ...d, profile: { ...d.profile!, [k]: v } }))
  const setS = (patch: Partial<S>) => update((d) => ({ ...d, settings: { ...d.settings, ...patch } }))
  const setRest = (k: keyof S['rest'], v: number) => setS({ rest: { ...s.rest, [k]: v } })
  const [wText, setWText] = useState(String(p.weight))
  const [tText, setTText] = useState(String(p.target))
  const toggleDay = (i: number) => setP('days', p.days.includes(i) ? p.days.filter((d) => d !== i) : [...p.days, i].sort())
  const active = REST_PRESETS.find((r) => JSON.stringify(r.rest) === JSON.stringify(s.rest))?.id

  const sample = ['dbcurl', 'latraise', 'dbpress', 'bench', 'squat'].map((id) => EXERCISES.find((e) => e.id === id)!)
  const slider = (label: string, k: keyof S['rest'], min: number, max: number, hint: string) => (
    <label>
      <span className="row"><span>{label} <span className="small mute">{hint}</span></span><b style={{ color: 'var(--text)' }}>{s.rest[k] === 0 && k === 'keyBonus' ? 'none' : fmtRest(s.rest[k])}{k === 'keyBonus' && s.rest[k] > 0 ? ' extra' : ''}</b></span>
      <input type="range" min={min} max={max} step={5} value={s.rest[k]} onChange={(e) => setRest(k, Number(e.target.value))} />
    </label>
  )

  return (
    <>
      <div><h1>Settings</h1><p className="mute">Everything here is adjustable. Changes save instantly.</p></div>

      <section className="card">
        <h2>⏱ Rest timer</h2>
        <p className="small mute">Bigger muscles and heavy main lifts need longer rests. Small muscles recover faster.</p>
        <Toggle label="Start timer automatically" hint="When you log the reps for a set" on={s.autoTimer} onClick={() => setS({ autoTimer: !s.autoTimer })} />
        <Toggle label="Sound when rest is over" on={s.sound} onClick={() => setS({ sound: !s.sound })} />
        <Toggle label="Vibrate when rest is over" hint="Android phones. iPhones don’t allow web vibration." on={s.vibrate} onClick={() => setS({ vibrate: !s.vibrate })} />
        <h3>Presets</h3>
        <div className="chips">{REST_PRESETS.map((r) => <button key={r.id} className={`chip ${active === r.id ? 'on' : ''}`} onClick={() => setS({ rest: r.rest })}>{r.label}</button>)}</div>
        <p className="small mute">{REST_PRESETS.find((r) => r.id === active)?.hint ?? 'Custom'}</p>
        {slider('Small muscles', 'small', 15, 120, 'biceps, triceps, side delts, calves, abs')}
        {slider('Medium muscles', 'medium', 30, 180, 'shoulders, mid back, traps')}
        {slider('Large muscles', 'large', 45, 240, 'chest, back, quads, hamstrings')}
        {slider('Heavy main lifts', 'keyBonus', 0, 120, 'added to your key lifts')}
        <div className="rec start">
          <b>What that means for you</b>
          {sample.map((e) => <div key={e.id} className="row small"><span>{e.name}</span><b>{fmtRest(restFor(e, s.rest))}</b></div>)}
        </div>
      </section>

      <section className="card">
        <h2>Workout</h2>
        <Toggle label="Ask how hard my last set felt (RPE)" hint="One quick rating at the end of each exercise. Helps the app decide when to add weight." on={s.rpeEnabled} onClick={() => setS({ rpeEnabled: !s.rpeEnabled })} />
        <h3>Workout length</h3>
        <p className="small mute">If your workout clock is still running after this long, we ask “still working out?” and end it automatically 30 minutes later if you don’t answer.</p>
        <div className="chips">{[2, 3, 4, 5, 8].map((h) => <button key={h} className={`chip ${s.maxWorkoutHours === h ? 'on' : ''}`} onClick={() => setS({ maxWorkoutHours: h })}>{h} hours</button>)}</div>
      </section>

      <section className="card">
        <h2>Training</h2>
        <h3>Goal</h3>
        <div className="chips">{(Object.keys(GOALS) as Goal[]).map((g) => <button key={g} className={`chip ${p.goal === g ? 'on' : ''}`} onClick={() => setP('goal', g)}>{GOALS[g]}</button>)}</div>
        <h3>Experience</h3>
        <div className="chips">{(Object.keys(LEVELS) as Level[]).map((l) => <button key={l} className={`chip ${p.level === l ? 'on' : ''}`} onClick={() => setP('level', l)}>{LEVELS[l]}</button>)}</div>
        <h3>Style</h3>
        <div className="chips">{([['hypertrophy', 'Bodybuilding'], ['strength', 'Strength'], ['mixed', 'Mixed']] as const).map(([k, l]) => <button key={k} className={`chip ${p.style === k ? 'on' : ''}`} onClick={() => setP('style', k)}>{l}</button>)}</div>
        <h3>Training days</h3>
        <div className="chips">{DAY_NAMES.map((n, i) => <button key={n} className={`chip ${p.days.includes(i) ? 'on' : ''}`} onClick={() => toggleDay(i)}>{n}</button>)}</div>
        <label>Workout time<input type="time" value={p.time} onChange={(e) => setP('time', e.target.value)} /></label>
        <h3>Equipment</h3>
        <div className="chips">{([['gym', 'Full gym'], ['db', 'Dumbbells only'], ['bw', 'Bodyweight']] as [Gear, string][]).map(([k, l]) => <button key={k} className={`chip ${p.gear === k ? 'on' : ''}`} onClick={() => setP('gear', k)}>{l}</button>)}</div>
        <label>Injuries or exercises to avoid<input value={p.avoid} onChange={(e) => setP('avoid', e.target.value)} placeholder="e.g. shoulder, lunge" /></label>
        <Toggle label="Include cardio" on={p.cardio} onClick={() => setP('cardio', !p.cardio)} />
      </section>

      <section className="card">
        <h2>Body</h2>
        <div className="grid2">
          <label>Current weight (lb)<input inputMode="decimal" value={wText} onChange={(e) => { const v = e.target.value.replace(/[^0-9.]/g, ''); setWText(v); setP('weight', num(v, p.weight)) }} /></label>
          <label>Target weight (lb)<input inputMode="decimal" value={tText} onChange={(e) => { const v = e.target.value.replace(/[^0-9.]/g, ''); setTText(v); setP('target', num(v, p.target)) }} /></label>
        </div>
        <p className="small mute">This sets your calorie and macro targets on the Fuel tab.</p>
      </section>

      <section className="card">
        <h2>Reminders &amp; community</h2>
        <Toggle label="Accountability reminders" on={p.reminders} onClick={() => setP('reminders', !p.reminders)} />
        <Toggle label="I want to join a crew" hint="Turn off to train solo. You can still browse crews anytime." on={p.wantsCommunity} onClick={() => setP('wantsCommunity', !p.wantsCommunity)} />
        <Link to="/crew" className="btn ghost">Manage crews</Link>
      </section>

      <section className="card">
        <h2>Crew matching</h2>
        <p className="small mute">Optional. These answers only help us suggest crews that fit you. Change them anytime.</p>
        <MatchQuestions p={p} onChange={(patch) => update((d) => ({ ...d, profile: { ...d.profile!, ...patch } }))} />
      </section>

      <section className="card">
        <h2>Your data</h2>
        <Link to="/import" className="btn ghost">Import lifting history / starting weights</Link>
        <Link to="/photos" className="btn ghost">Progress photos</Link>
        <Link to="/shortcuts" className="btn ghost">Siri &amp; Shortcuts</Link>
      </section>

      <section className="card">
        <h2>Account</h2>
        <p className="small mute">{data.name} · {email}</p>
        <button className="ghost" onClick={logOut}>Log out</button>
        <div className="row wrap small mute"><Link to="/privacy" style={{ textDecoration: 'underline' }}>Privacy</Link><Link to="/terms" style={{ textDecoration: 'underline' }}>Terms</Link></div>
      </section>
    </>
  )
}
