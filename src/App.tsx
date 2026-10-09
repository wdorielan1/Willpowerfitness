import { useEffect } from 'react'
import { NavLink, Navigate, Route, Routes, Link, useLocation } from 'react-router-dom'
import { useApp } from './store'
import Auth from './pages/Auth'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import Communities from './pages/Communities'
import Workout from './pages/Workout'
import Progress from './pages/Progress'
import QuickLog from './pages/QuickLog'
import Nutrition from './pages/Nutrition'
import Shortcuts from './pages/Shortcuts'
import Profile from './pages/Profile'
import Go from './pages/Go'
import Landing from './pages/Landing'
import Friends from './pages/Friends'
import Challenges, { ChallengeSync } from './pages/Challenges'
import Settings from './pages/Settings'
import { RestTimerProvider } from './RestTimer'
import { WorkoutGuard } from './components'
import Photos from './pages/Photos'
import ImportHistory from './pages/ImportHistory'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'

export const Logo = ({ size = 32 }: { size?: number }) => (
  <img src={`${import.meta.env.BASE_URL}logo.svg`} width={size} height={size} alt="Will Power Fitness" />
)

const tabs = [
  ['/', 'Today', '◉'],
  ['/crew', 'Crew', '👥'],
  ['/workout', 'Lift', '🏋'],
  ['/progress', 'Progress', '📈'],
  ['/nutrition', 'Fuel', '🍽'],
] as const

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }) }, [pathname])
  return null
}

export default function App() {
  const { email, data, loading } = useApp()
  const loc = useLocation()
  if (loading) return <div className="auth" style={{ justifyItems: 'center' }}><Logo size={64} /></div>
  if (!email) {
    return (
      <>
      <ScrollTop />
      <Routes>
        <Route path="/join" element={<Auth />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="*" element={<Landing />} />
      </Routes>
      </>
    )
  }
  if (!data.profile) return <Onboarding />
  return (
    <RestTimerProvider>
    <div className="shell">
      <ScrollTop />
      <WorkoutGuard />
      <ChallengeSync />
      <header className="top">
        <Link to="/" className="brand"><Logo size={30} /><span>WILL POWER</span></Link>
        <nav className="top-links">
          <Link to="/shortcuts">Siri</Link>
          <Link to="/settings">Settings</Link>
          <Link to="/profile">Profile</Link>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/crew" element={<Communities />} />
          <Route path="/workout" element={<Workout />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/challenges" element={<Challenges />} />
          <Route path="/friends" element={<Friends />} />
          <Route path="/log" element={<QuickLog />} />
          <Route path="/photos" element={<Photos />} />
          <Route path="/import" element={<ImportHistory />} />
          <Route path="/nutrition" element={<Nutrition />} />
          <Route path="/shortcuts" element={<Shortcuts />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/go/:action" element={<Go />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <nav className="tabbar">
        {tabs.map(([to, label, icon]) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive || (to === '/crew' && ['/challenges', '/friends'].includes(loc.pathname)) ? 'on' : '')}>
            <span>{icon}</span>{label}
          </NavLink>
        ))}
      </nav>
    </div>
    </RestTimerProvider>
  )
}
