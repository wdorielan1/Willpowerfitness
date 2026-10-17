import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../store'
import { DAY_NAMES, EXERCISES, GOALS, LEVELS, REST_PRESETS } from '../data'
import { DEFAULT_LIFTS, fmtRest, macroPlan, restFor } from '../engine'
import MatchQuestions from '../MatchQuestions'
import ProfileSettings from '../ProfileSettings'
import { FocusPicker, SexPicker } from '../ProfilePickers'
import { EquipmentPicker } from '../EquipmentPicker'
import { DeleteAccountSheet } from '../DeleteAccount'
import { PostTo, useMyCrews } from '../CrewPicker'
import { autoShareCrews } from '../workoutPost'
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
  const { data, update, email, logOut, saveState } = useApp()
  const p = data.profile!
  const s = data.settings
  const setP = <K extends keyof Profile>(k: K, v: Profile[K]) => update((d) => ({ ...d, profile: { ...d.profile!, [k]: v } }))
  const myCrews = useMyCrews()
  const setS = (patch: Partial<S>) => update((d) => ({ ...d, settings: { ...d.settings, ...patch } }))
  const setRest = (k: keyof S['rest'], v: number) => setS({ rest: { ...s.rest, [k]: v } })
  const [deleting, setDeleting] = useState(false)
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
      <div><h1>Settings</h1><p className="mute">Everything here is adjustable. Changes save automatically.</p>
        <p className="small" role="status" aria-live="polite" style={{ minHeight: 18, margin: '4px 0 0', color: saveState === 'error' ? 'var(--bad, #ff6b6b)' : 'var(--mute)' }}>
          {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? '✓ Saved' : saveState === 'error' ? 'Saved on this phone, but couldn’t sync yet. It will retry.' : ''}
        </p></div>

      <ProfileSettings />

      <section className="card">
        <h2>⏱ Rest timer</h2>
        <p className="small mute">Starts at 1 minute for every lift. Raise it for big muscles or heavy lifts if you want longer.</p>
        <Toggle label="Start timer automatically" hint="When you tap Log set" on={s.autoTimer} onClick={() => setS({ autoTimer: !s.autoTimer })} />
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
        <h2>Home</h2>
        <Toggle label="Show nutrition on Home" hint="Today’s calories and protein, under your week. Hide it if you don’t track food." on={s.hideNutrition !== true} onClick={() => setS({ hideNutrition: s.hideNutrition !== true })} />
      </section>

      <section className="card">
        <h2>Workout</h2>
        <Toggle label="Share finished workouts to my crew" hint={myCrews.length > 1 ? "Posts a workout card to the crews you pick below when you finish. You can also share any workout later, with a photo, to the crews you choose." : "Posts a workout card to your crew’s feed when you finish."} on={s.autoShare} onClick={() => setS({ autoShare: !s.autoShare })} />
        {s.autoShare && myCrews.length > 1 && <PostTo crews={myCrews} value={autoShareCrews(data)} onChange={(ids) => setS({ shareCrews: ids })} label="Share to" />}
        <Toggle label="Offer to save my workout when I finish" hint="Save it as your Leg Day or Push Day, and we offer it first next time you train that day." on={s.askSave !== false} onClick={() => setS({ askSave: s.askSave === false })} />
        <Toggle label="Show my weights in crew posts" hint="Your shared workout shows your top lifts, the total weight and the weight of a PR. Off: your crew only sees the session, time, sets and streak." on={s.shareLifts !== false} onClick={() => setS({ shareLifts: s.shareLifts === false })} />
        <label>Where I train (optional)<input value={s.postPlace ?? ''} maxLength={40} onChange={(e) => setS({ postPlace: e.target.value })} placeholder="A gym or town" autoComplete="off" /></label>
        <p className="small mute">Shown at the top of your workout posts in the crew, with the day and time you finished. Just a name you type; we never use your phone’s location.</p>
        <Toggle label="Check in when I skip lifts or workouts" hint="After a couple of skipped lifts, or two missed workouts, we ask what’s in the way and offer a fix. We never change anything until you tap." on={s.askSkips !== false} onClick={() => setS({ askSkips: s.askSkips === false })} />
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
        <h3>Lifts per workout</h3>
        <div className="chips lifts-chips" role="group" aria-label="Lifts per workout">{[4, 5, 6, 7, 8].map((n) => <button key={n} className={`chip ${(p.lifts ?? DEFAULT_LIFTS[p.level]) === n ? 'on' : ''}`} aria-pressed={(p.lifts ?? DEFAULT_LIFTS[p.level]) === n} onClick={() => setP('lifts', n === DEFAULT_LIFTS[p.level] && p.lifts === undefined ? undefined : n)}>{n}</button>)}</div>
        <p className="small mute">{p.lifts ? `Each workout has ${p.lifts} lifts, including any extra a body part you chose to focus on adds.` : `Usually ${DEFAULT_LIFTS[p.level]} for your level, plus any extra a body part you chose to focus on adds.`}{p.lifts !== undefined && <> <button type="button" className="quiet-action" onClick={() => setP('lifts', undefined)}>Back to usual ({DEFAULT_LIFTS[p.level]})</button></>}</p>
        <h3>Training days</h3>
        <div className="chips">{DAY_NAMES.map((n, i) => <button key={n} className={`chip ${p.days.includes(i) ? 'on' : ''}`} onClick={() => toggleDay(i)}>{n}</button>)}</div>
        <label>Workout time<input type="time" value={p.time} onChange={(e) => setP('time', e.target.value)} /></label>
        <h3>Equipment</h3>
        <div className="chips">{([['gym', 'Full gym'], ['db', 'Dumbbells only'], ['bw', 'Bodyweight']] as [Gear, string][]).map(([k, l]) => <button key={k} className={`chip ${p.gear === k ? 'on' : ''}`} onClick={() => setP('gear', k)}>{l}</button>)}</div>
        <h4>Equipment you use</h4>
        <p className="small mute">Pick how often you use each kind. Your plan, swaps and the Add list stay on what you use.</p>
        <EquipmentPicker gear={p.gear} equip={p.equip} onChange={(equip) => setP('equip', equip)} />
        <h4>Hidden exercises</h4>
        <p className="small mute">Lifts you chose “Never show me this” for with the thumbs-down in a workout. They stay out of your plan, Swap, Add and search until you show them again.</p>
        {(() => {
          const hid = Object.keys(p.hidden ?? {}).map((id) => EXERCISES.find((x) => x.id === id)).filter((x): x is NonNullable<typeof x> => !!x)
          return hid.length === 0 ? <p className="small mute">None yet.</p> : <div className="people hidden-lifts">{hid.map((x) => (
            <div className="row" key={x.id}><span>{x.name}<br /><span className="small mute">{x.muscle}</span></span>
              <button type="button" className="ghost small-btn" onClick={() => setP('hidden', Object.fromEntries(Object.entries(p.hidden ?? {}).filter(([id]) => id !== x.id)))}>Show again</button></div>
          ))}</div>
        })()}
        <p className="small mute">Will Power quietly learns from what you do, on your own account only: the lifts you finish, swap away, remove and save. It never hides anything without asking.</p>
        <label>Injuries or exercises to avoid<input value={p.avoid} onChange={(e) => setP('avoid', e.target.value)} placeholder="e.g. shoulder, lunge" /></label>
        <Toggle label="Include cardio" on={p.cardio} onClick={() => setP('cardio', !p.cardio)} />
        <h3>Switch up my exercises</h3>
        <div className="chips">{([['weekly', 'Every week'], ['biweekly', 'Every 2 weeks'], ['monthly', 'Monthly'], ['never', 'Never']] as const).map(([k, l]) => <button key={k} className={`chip ${s.rotation === k ? 'on' : ''}`} aria-pressed={s.rotation === k} onClick={() => setS({ rotation: k })}>{l}</button>)}</div>
        <p className="small mute">Your main lifts stay the same for 4 weeks so you can add weight. Accessory exercises change on this schedule, picked for your goal, level and equipment.</p>
      </section>

      <section className="card">
        <h2>🍽 Nutrition targets</h2>
        <p className="small mute">Pick your own numbers. Carbs fill whatever calories are left.</p>
        <label><span className="row"><span>Protein <span className="small mute">grams per lb of body weight</span></span><b style={{ color: 'var(--text)' }}>{s.nutrition.proteinPerLb.toFixed(2)} g/lb</b></span>
          <input type="range" min={0.5} max={1.5} step={0.05} value={s.nutrition.proteinPerLb} onChange={(e) => setS({ nutrition: { ...s.nutrition, proteinPerLb: Number(e.target.value) } })} /></label>
        <label><span className="row"><span>Fat <span className="small mute">grams per lb of body weight</span></span><b style={{ color: 'var(--text)' }}>{s.nutrition.fatPerLb.toFixed(2)} g/lb</b></span>
          <input type="range" min={0.2} max={0.6} step={0.05} value={s.nutrition.fatPerLb} onChange={(e) => setS({ nutrition: { ...s.nutrition, fatPerLb: Number(e.target.value) } })} /></label>
        <label><span className="row"><span>Calories <span className="small mute">adjust up or down</span></span><b style={{ color: 'var(--text)' }}>{s.nutrition.calorieAdjust > 0 ? '+' : ''}{s.nutrition.calorieAdjust} kcal</b></span>
          <input type="range" min={-800} max={800} step={50} value={s.nutrition.calorieAdjust} onChange={(e) => setS({ nutrition: { ...s.nutrition, calorieAdjust: Number(e.target.value) } })} /></label>
        <h3>Meals per day</h3>
        <div className="chips">{[2, 3, 4, 5, 6].map((k) => <button key={k} className={`chip ${s.nutrition.meals === k ? 'on' : ''}`} onClick={() => setS({ nutrition: { ...s.nutrition, meals: k } })}>{k} meals</button>)}</div>
        {(() => { const m = macroPlan(p, s.nutrition).medium; return <div className="rec start"><b>Medium carb day</b><div className="small">{m.cal} kcal · {m.p}g protein · {m.c}g carbs · {m.f}g fat</div></div> })()}
        <button className="ghost" onClick={() => setS({ nutrition: { meals: 4, proteinPerLb: 1, fatPerLb: 0.35, calorieAdjust: 0 } })}>Reset to recommended</button>
      </section>

      <section className="card">
        <h2>Body</h2>
        <h4>Sex</h4>
        <SexPicker value={p.sex} onChange={(v) => setP('sex', v)} />
        <h4>Body parts to focus on</h4>
        <FocusPicker value={p.focus ?? []} onChange={(v) => setP('focus', v)} />
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
        <Link to="/export" className="btn ghost">Export my data (AI coach, CSV)</Link>
        <Link to="/import" className="btn ghost">Import lifting history / starting weights</Link>
        <Link to="/photos" className="btn ghost">Progress photos</Link>
        <Link to="/shortcuts" className="btn ghost">Siri &amp; Shortcuts</Link>
      </section>

      <section className="card">
        <h2>Account</h2>
        <p className="small mute">{data.name} · {email}</p>
        <button className="ghost" onClick={logOut}>Log out</button>
        <button className="link-danger" onClick={() => setDeleting(true)}>Delete my account</button>
        {deleting && <DeleteAccountSheet onClose={() => setDeleting(false)} />}
        <div className="row wrap small mute"><Link to="/privacy" style={{ textDecoration: 'underline' }}>Privacy</Link><Link to="/terms" style={{ textDecoration: 'underline' }}>Terms</Link></div>
      </section>
    </>
  )
}
