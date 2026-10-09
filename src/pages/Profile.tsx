import { Link } from 'react-router-dom'
import { useApp } from '../store'
import { DAY_NAMES, GOALS, LEVELS } from '../data'
import { fmtTime } from '../engine'
import { useCrew } from './Crew'

export default function Profile() {
  const { data, email, update, logOut } = useApp()
  const p = data.profile!
  const crew = useCrew()
  const redo = () => update((d) => ({ ...d, profile: null }))
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
        <b>{data.name}</b><span className="small mute">{email}</span>
        {rows.map(([k, v]) => <div key={k} className="row small"><span className="mute">{k}</span><b>{v}</b></div>)}
        <button className="ghost" onClick={redo}>Edit onboarding answers</button>
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
