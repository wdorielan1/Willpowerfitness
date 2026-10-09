import { NavLink } from 'react-router-dom'

/** Sub-navigation for the social part of the app. */
export default function SocialTabs() {
  const items = [['/crew', 'Feed'], ['/challenges', 'Challenges'], ['/friends', 'Friends']] as const
  return (
    <div className="tabs">
      {items.map(([to, label]) => <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'on' : '')} style={{ flex: 1, textAlign: 'center', padding: '10px 6px', borderRadius: 10, fontWeight: 800, fontSize: 14 }}>{label}</NavLink>)}
    </div>
  )
}
