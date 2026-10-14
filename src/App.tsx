import { useEffect, useState } from 'react'
import { NavLink, Navigate, Route, Routes, Link, useLocation } from 'react-router-dom'
import { useApp } from './store'
import { dayFor, todayISO } from './engine'
import { Icon, type IconName } from './icons'
import { Sheet } from './components'
import Auth from './pages/Auth'
import Onboarding from './pages/Onboarding'
import CheckEmail from './pages/CheckEmail'
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
import FriendProfile from './pages/FriendProfile'
import Export from './pages/Export'
import Challenges, { ChallengeSync } from './pages/Challenges'
import Settings from './pages/Settings'
import { RestTimerProvider } from './RestTimer'
import { WorkoutGuard } from './components'
import Photos from './pages/Photos'
import ImportHistory from './pages/ImportHistory'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import Notifications, { NotificationBell } from './Notifications'
import Search from './pages/Search'
import { AgeGate } from './AgeGate'

export const Logo = ({ size = 32 }: { size?: number }) => (
  <img src={`${import.meta.env.BASE_URL}logo.svg`} width={size} height={size} alt="Will Power" />
)

const tabs: [string, string, IconName][] = [
  ['/', 'Today', 'home'],
  ['/workout', 'Train', 'weight'],
  ['/crew', 'Crew', 'crew'],
  ['/progress', 'Progress', 'chart'],
  ['/nutrition', 'Nutrition', 'food'],
]

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }) }, [pathname])
  return null
}

export default function App() {
  const { email, data, loading, accountError, syncError, retryAccount, logOut } = useApp()
  const loc = useLocation()
  const [accountMenu, setAccountMenu] = useState(false)
  const today = todayISO()
  const hasSession = !!data.started[today] || data.logs.some((l) => l.date === today && !l.baseline) || [data.drafts[today]?.completed, data.drafts[today]?.touched].some((m) => Object.values(m ?? {}).some((a) => a.some(Boolean)))
  const training = loc.pathname === '/workout' && !!data.profile && hasSession && dayFor(today, data) !== 'Rest/Cardio'
  useEffect(() => { setAccountMenu(false) }, [loc.pathname])
  useEffect(() => {
    document.body.classList.toggle('training-mode', training)
    return () => document.body.classList.remove('training-mode')
  }, [training])
  if (loading) return <div className="auth" style={{ justifyItems: 'center' }}><Logo size={64} /></div>
  if (accountError) return <div className="auth account-reconnect"><Logo size={48} /><h1>Reconnect your account</h1><p className="mute">We couldn’t load your saved profile. Your setup hasn’t been reset.</p><p className="err" role="alert">{accountError}</p><button className="primary" onClick={retryAccount}>Try again</button><button className="ghost" onClick={logOut}>Sign out</button></div>
  if (!email) {
    return (
      <>
      <ScrollTop />
      <Routes>
        <Route path="/join" element={<Auth />} />
        <Route path="/check-email" element={<CheckEmail />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="*" element={<Landing />} />
      </Routes>
      </>
    )
  }
  // everyone's age is checked once: new sign ups on the sign up page, everyone else here
  if (!data.ageConfirmed) return <Routes><Route path="/privacy" element={<Privacy />} /><Route path="/terms" element={<Terms />} /><Route path="*" element={<AgeGate />} /></Routes>
  if (!data.profile) return <Onboarding />
  return (
    <RestTimerProvider>
    <div className={`shell ${training ? 'training' : ''}`}>
      <ScrollTop />
      <WorkoutGuard />
      <ChallengeSync />
      <header className="top">
        <Link to="/" className="brand"><Logo size={30} /><span>WILL POWER</span></Link>
        <div className="top-actions"><Link to="/search" className="icon-button" aria-label="Search"><Icon name="search" /></Link><NotificationBell /><button className="icon-button account-button" aria-label="Open account menu" onClick={() => setAccountMenu(true)}><Icon name="person" /></button></div>
      </header>
      <main>
        {syncError && <div className="account-sync-note" role="status"><p>{syncError}</p><button className="quiet-action" onClick={retryAccount}>Retry connection</button></div>}
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/crew" element={<Communities />} />
          <Route path="/workout" element={<Workout />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/challenges" element={<Challenges />} />
          <Route path="/friends" element={<Friends />} />
          <Route path="/friend/:id" element={<FriendProfile />} />
          <Route path="/export" element={<Export />} />
          <Route path="/log" element={<QuickLog />} />
          <Route path="/photos" element={<Photos />} />
          <Route path="/import" element={<ImportHistory />} />
          <Route path="/nutrition" element={<Nutrition />} />
          <Route path="/shortcuts" element={<Shortcuts />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/search" element={<Search />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/go/:action" element={<Go />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <nav className="tabbar" aria-label="Main navigation">
        {tabs.map(([to, label, icon]) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive || (to === '/crew' && (['/challenges', '/friends'].includes(loc.pathname) || loc.pathname.startsWith('/friend/'))) ? 'on' : '')}>
            <Icon name={icon} /><span className="tab-label">{label}</span>
          </NavLink>
        ))}
      </nav>
      {accountMenu && <Sheet title="Your account" onClose={() => setAccountMenu(false)}>
        <Link className="account-link" to="/profile"><Icon name="person" />Profile</Link>
        <Link className="account-link" to="/settings"><Icon name="settings" />Settings</Link>
        <Link className="account-link" to="/shortcuts"><Icon name="clock" />Siri & Apple Shortcuts</Link>
      </Sheet>}
    </div>
    </RestTimerProvider>
  )
}
