import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../store'
import { Avatar } from '../components'
import { avatarFromFile } from '../photos'
import { DAY_NAMES, GOALS, LEVELS } from '../data'
import { fmtTime } from '../engine'
import { useCrew } from './Crew'

export default function Profile() {
  const { data, email, logOut, avatarUrl, googlePhoto, setAvatar } = useApp()
  const file = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')
  const pick = async (f: File | undefined) => {
    if (!f) return
    try { setAvatar(await avatarFromFile(f)); setMsg('Photo updated.') } catch (e) { setMsg(e instanceof Error ? e.message : 'Could not use that photo.') }
  }
  const p = data.profile!
  const crew = useCrew()
  const rows: [string, string][] = [
    ['Goal', GOALS[p.goal]], ['Experience', LEVELS[p.level]], ['Days', p.days.map((d) => DAY_NAMES[d]).join(', ')],
    ['Time', fmtTime(p.time)], ['Equipment', { gym: 'Full gym', db: 'Dumbbells', bw: 'Bodyweight' }[p.gear]],
    ['Weight', `${p.weight} → ${p.target} lb`], ['Cardio', p.cardio ? 'Included' : 'Off'], ['Reminders', p.reminders ? 'On' : 'Off'],
    ['Avoid', p.avoid || '—'], ['Crew', crew?.name ?? 'None'],
  ]
  return (
    <>
      <h1>Profile</h1>
      <section className="card">
        <Avatar name={data.name} url={avatarUrl} size={72} />
        <input ref={file} type="file" accept="image/*" hidden onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = '' }} />
        <div className="row wrap">
          <button className="ghost small-btn" onClick={() => file.current?.click()}>{avatarUrl ? 'Change photo' : 'Add photo'}</button>
          {data.avatar && <button className="ghost small-btn" onClick={() => { setAvatar(null); setMsg(googlePhoto ? 'Back to your Google photo.' : 'Photo removed.') }}>{googlePhoto ? 'Use my Google photo' : 'Remove photo'}</button>}
        </div>
        {msg && <p className="small mute" role="status">{msg}</p>}
        <b>{data.name}</b><span className="small mute">{email}</span>
        {rows.map(([k, v]) => <div key={k} className="row small"><span className="mute">{k}</span><b>{v}</b></div>)}
        <Link to="/settings" className="btn ghost">Change these in Settings</Link>
      </section>
      <section className="card">
        <h3>Plans</h3>
        <p className="small mute">Will Power is free during beta. Pro, premium 5 AM Club, paid challenges and coaching are coming later.</p>
        <span className="tag ok">Free beta</span>
      </section>
      <Link to="/privacy" className="small mute" style={{ textAlign: 'center', textDecoration: 'underline' }}>Privacy Policy</Link>
      <Link to="/terms" className="small mute" style={{ textAlign: 'center', textDecoration: 'underline' }}>Terms of Service</Link>
      <button className="ghost" onClick={logOut}>Log out</button>
    </>
  )
}
