import { NavLink } from 'react-router-dom'
import { Icon, type IconName } from './icons'

/** Sub-navigation for the social part of the app. */
export default function SocialTabs() {
  const items: { to: string; label: string; icon: IconName }[] = [
    { to: '/crew', label: 'Feed', icon: 'crew' },
    { to: '/challenges', label: 'Challenges', icon: 'chart' },
    { to: '/friends', label: 'Friends', icon: 'person' },
  ]
  return (
    <nav className="social-tabs" aria-label="Crew navigation">
      {items.map(({ to, label, icon }) => <NavLink key={to} to={to} className={({ isActive }) => `social-tab${isActive ? ' on' : ''}`}><Icon name={icon} size={17} /><span>{label}</span></NavLink>)}
    </nav>
  )
}
