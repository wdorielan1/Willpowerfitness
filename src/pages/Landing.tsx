import { Link } from 'react-router-dom'
import { Logo } from '../App'
import { COMMUNITIES, TAGLINE } from '../data'
import { fmtTime } from '../engine'

const STEPS = [
  ['Join a crew', 'Pick a community by the time you train and the goal you share: 5 AM Club, Lunch Break Crew, Fat Loss Accountability and more.'],
  ['Commit to a time', 'Set your workout time. Tap “I’m going” so your crew knows you are showing up.'],
  ['Train with structure', 'Get today’s workout, log every set, and see exactly when to add weight.'],
  ['Check in and keep the streak', 'Tap “Workout complete.” Your streak and your crew’s completion rate go up.'],
]

const FEATURES = [
  ['👥', 'Workout communities', 'Daily check-ins, “who’s training today,” group completion rate, streaks and a leaderboard.'],
  ['📈', 'Progressive overload', 'Remembers your last lifts and tells you to add weight, add reps, or repeat.'],
  ['🏋', 'Daily workout generator', 'Push, pull, legs, shoulders/abs and full body, built from your goal, equipment and history.'],
  ['🎙', 'Siri & Apple Shortcuts', 'Wake up to your gym routine, log “I’m going,” and open today’s workout by voice.'],
  ['🍽', 'Nutrition targets', 'Calories and macros with low, medium and high carb days that follow your training.'],
  ['⏱', 'Built for the gym', 'Mobile-first and dark. Big buttons, number-pad logging, fast between sets.'],
]

export default function Landing() {
  return (
    <div className="site">
      <header className="site-nav">
        <div className="brand"><Logo size={34} /><span>WILL POWER</span></div>
        <Link to="/join?m=login" className="small mute">Log in</Link>
      </header>

      <section className="hero-sec">
        <div className="tagline">{TAGLINE}</div>
        <h1 className="mega">The hardest part of the gym is showing up.</h1>
        <p className="lead">Will Power Fitness is an accountability community for people who need help being consistent. Join a crew that trains when you train, check in daily, and lift with structure.</p>
        <div className="cta-row">
          <Link to="/join" className="btn primary big">Join the free beta</Link>
          <a href="#how" className="btn ghost big">How it works</a>
        </div>
        <p className="small mute">Free during beta. No card needed.</p>

        <div className="mock" aria-hidden>
          <div className="row"><span className="tag accent">Today’s workout</span><span className="tag">🔥 12 day streak</span></div>
          <b style={{ fontSize: 22 }}>Push</b>
          <span className="small mute">Committed to 6:00 AM · 5 AM Club</span>
          <div className="grid2"><div className="btn primary">I’m going</div><div className="btn">Workout complete</div></div>
          <div className="bar"><i style={{ width: '78%' }} /></div>
          <span className="small mute">Example screen. Group completion today: 78%</span>
        </div>
      </section>

      <section className="sec">
        <h2 className="sec-h">You are not lazy. You are alone.</h2>
        <p className="lead">Most people do not fail because they do not know what to do. They stop because nobody notices when they skip. Here, your crew does.</p>
      </section>

      <section className="sec" id="how">
        <h2 className="sec-h">How it works</h2>
        <div className="steps-grid">
          {STEPS.map(([t, d], i) => (
            <div className="card" key={t}><span className="num">{i + 1}</span><h3>{t}</h3><p className="mute small">{d}</p></div>
          ))}
        </div>
      </section>

      <section className="sec">
        <h2 className="sec-h">Find your crew</h2>
        <p className="lead">Crews are built around when and why you train.</p>
        <div className="crew-grid">
          {COMMUNITIES.slice(0, 7).map((c) => (
            <div className="card" key={c.id}>
              <div className="row"><h3>{c.name}</h3><span className="tag accent">{fmtTime(c.time)}</span></div>
              <p className="small mute">{c.vibe}</p>
            </div>
          ))}
        </div>
        <p className="small mute">Or start a time-based crew for 5 AM, 6 AM, 12 PM, 5:30 PM, 7 PM, or any time you choose.</p>
      </section>

      <section className="sec">
        <h2 className="sec-h">Everything you need to stay consistent</h2>
        <div className="feat-grid">
          {FEATURES.map(([i, t, d]) => (
            <div className="card" key={t}><span style={{ fontSize: 26 }}>{i}</span><h3>{t}</h3><p className="mute small">{d}</p></div>
          ))}
        </div>
      </section>

      <section className="sec">
        <div className="card hero siri">
          <span className="tag accent">Siri & Apple Shortcuts</span>
          <h2>“Hey Siri, wake me up for the gym.”</h2>
          <p className="mute">Set up a shortcut that wakes you up, opens your workout, and prompts you to commit. Log “I’m going” and “Workout complete” with your voice.</p>
        </div>
      </section>

      <section className="sec">
        <h2 className="sec-h">Free while we build</h2>
        <p className="lead">Will Power is free during the beta. Later we plan to add optional Pro features, premium crews like a 5 AM Club, and paid 30-day challenges. Beta members get a say in what we build.</p>
      </section>

      <section className="sec final">
        <h1 className="mega" style={{ fontSize: 'clamp(30px,6vw,52px)' }}>Wake Up. Show Up. Lift.</h1>
        <Link to="/join" className="btn primary big">Join the free beta</Link>
      </section>

      <footer className="site-foot small mute">
        <Logo size={22} /> © {new Date().getFullYear()} Will Power Fitness
      </footer>
    </div>
  )
}
