import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Sheet } from './components'
import { Icon } from './icons'

/** Sub-navigation for the crew area: the free challenges, and Will Power Fantasy Fitness (the green one, for the money side). */
export default function SocialTabs() {
  const [fantasy, setFantasy] = useState(false)
  return (
    <>
      <nav className="social-tabs" aria-label="Crew navigation">
        <NavLink to="/challenges" className={({ isActive }) => `social-tab${isActive ? ' on' : ''}`}><Icon name="chart" size={17} /><span>Free Challenges</span></NavLink>
        <button type="button" className="social-tab fantasy" onClick={() => setFantasy(true)}><Icon name="weight" size={17} /><span>Will Power Fantasy Fitness</span></button>
      </nav>
      {fantasy && <FantasyWelcome onClose={() => setFantasy(false)} />}
    </>
  )
}

/** The popup that opens from the green tab. Nothing is bought or paid here yet. */
export function FantasyWelcome({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title="Welcome to Will Power Fantasy Fitness" onClose={onClose}>
      <div className="fantasy-welcome">
        <p className="fantasy-tagline">Think fantasy football meets fitness.</p>
        <ul>
          <li><b>Earn points</b> for being fit</li>
          <li><b>Join</b> challenges, or <b>create</b> your own</li>
          <li>Go <b>public</b>, play <b>solo</b>, or build a <b>crew</b> for a bigger challenge against another crew</li>
        </ul>
        <p className="fantasy-closer">Test your Will Power. Earn some points for being fit.</p>
        <p className="small mute">Fantasy Fitness is being built. Until it opens, the free challenges are live, and nothing here costs or pays money yet.</p>
        <Link to="/challenges" className="btn primary" onClick={onClose}>See the free challenges</Link>
        <button type="button" className="ghost" onClick={onClose}>Close</button>
      </div>
    </Sheet>
  )
}
