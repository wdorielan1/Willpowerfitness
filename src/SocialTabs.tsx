import { NavLink } from 'react-router-dom'

/** Sub-navigation for the social part of the app. */
export default function SocialTabs() {
  const items = [['/crew', 'Feed'], ['/challenges', 'Challenges'], ['/friends', 'Friends']] as const
  return (
    <nav className="social-tabs" aria-label="Crew navigation">
      {items.map(([to, label]) => <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'on' : '')}>{label}</NavLink>)}
    </nav>
  )
}
