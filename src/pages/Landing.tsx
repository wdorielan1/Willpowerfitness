import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../App'
import { CHALLENGES, type ChallengeDef } from '../challenges'
import { COMMUNITIES } from '../data'
import { Icon, type IconName } from '../icons'

type PreviewScreen = 'train' | 'crew'

const SCREENS: PreviewScreen[] = ['train', 'crew']
const PREVIEW_ALT: Record<PreviewScreen, string> = {
  train: 'Actual Will Power workout screen with exercise guidance, weight and rep inputs, and Log set button',
  crew: 'Actual Will Power Crew screen showing daily check-in and workout sharing',
}
const CHALLENGE_COPY: Record<string, { summary: string; icon: IconName | 'steps' }> = {
  gymrat: { summary: 'One completed workout per day counts.', icon: 'weight' },
  '5am': { summary: 'Start before 6 AM. Finish your workout. Set the pace.', icon: 'clock' },
  steps: { summary: 'Log your daily steps and climb the leaderboard.', icon: 'steps' },
}
const CHALLENGE_PERIOD: Record<ChallengeDef['period'], string> = {
  month: 'Monthly',
  biweek: 'Rounds on the 1st & 15th',
  week: 'Weekly',
  custom: 'Custom round',
}
const CHALLENGE_DURATION: Record<ChallengeDef['period'], string> = {
  month: 'Calendar month',
  biweek: 'Rounds start on the 1st and 15th',
  week: 'Monday to Sunday',
  custom: 'Custom dates',
}
const featuredChallenges = CHALLENGES.filter((challenge) => challenge.id in CHALLENGE_COPY)
const featuredCrews = COMMUNITIES.filter((crew) => ['5am', 'lunch', 'afterwork'].includes(crew.id))

function StepsIcon() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M6 4h4l1 5 6 2 3 4v3H4v-5l2-4Z M4 15h16 M8 10l2-1 M12 11l1-2" /></svg>
}

function scrollToSection(event: MouseEvent<HTMLAnchorElement>, id: string) {
  event.preventDefault()
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  document.getElementById(id)?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' })
}

function challengeRules(challenge: ChallengeDef) {
  if (challenge.id === 'steps') return `${challenge.rules.replace(' (Apple Health sync comes with the iPhone app)', '')} Steps are entered manually in the current app.`
  if (challenge.period === 'biweek') return challenge.rules.replace('Two-week rounds start on the 1st and the 15th.', 'Rounds run from the 1st through the 14th, and from the 15th through the end of the month.')
  return `${challenge.rules} Join in the app to track your score and view the leaderboard.`
}

export default function Landing() {
  const [screen, setScreen] = useState<PreviewScreen>('train')
  const [challenge, setChallenge] = useState<ChallengeDef | null>(null)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const dialogRef = useRef<HTMLDialogElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const challengeTrigger = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!challenge) return
    const dialog = dialogRef.current
    const container = containerRef.current
    if (!dialog) return
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    if (container) container.inert = true
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal()
    } else {
      dialog.classList.add('lp-dialog-fallback')
      dialog.setAttribute('open', '')
      dialog.querySelector<HTMLButtonElement>('button')?.focus()
    }
    return () => {
      document.body.style.overflow = overflow
      if (container) container.inert = false
      if (dialog.open && typeof dialog.close === 'function') dialog.close()
      else dialog.removeAttribute('open')
      dialog.classList.remove('lp-dialog-fallback')
      if (challengeTrigger.current?.isConnected) challengeTrigger.current.focus({ preventScroll: true })
    }
  }, [challenge])

  const selectPreviewWithKeyboard = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? SCREENS.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + SCREENS.length) % SCREENS.length
    setScreen(SCREENS[next])
    tabRefs.current[next]?.focus()
  }
  const dialogKeyboard = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      setChallenge(null)
    }
    if (event.key !== 'Tab') return
    const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button, a[href], [tabindex="0"]'))
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last?.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first?.focus()
    }
  }

  return (
    <div className="landing-page" id="top">
      <div className="lp-container" ref={containerRef}>
        <header className="lp-site-header">
          <a href="#top" className="lp-brand" aria-label="Will Power home" onClick={(event) => scrollToSection(event, 'top')}><Logo size={34} />WILL POWER</a>
          <nav className="lp-header-nav" aria-label="Homepage sections">
            <a href="#challenges" onClick={(event) => scrollToSection(event, 'challenges')}>Challenges</a>
            <a href="#crews" onClick={(event) => scrollToSection(event, 'crews')}>Crews</a>
            <a href="#the-app" onClick={(event) => scrollToSection(event, 'the-app')}>The app</a>
          </nav>
          <div className="lp-header-actions"><Link to="/join?m=login" className="lp-login">Log in</Link><Link to="/join" className="lp-button lp-primary">Start free<Icon name="arrow" /></Link></div>
        </header>

        <main>
          <section className="lp-hero" aria-labelledby="hero-heading">
            <div className="lp-hero-copy">
              <div className="lp-eyebrow"><span className="lp-dash" />Workout app + community</div>
              <h1 id="hero-heading">Your workout.<br /><em>Your crew.</em></h1>
              <p>Get your workout, log every set, and track your progress. Join a crew and take on challenges together.</p>
              <div className="lp-hero-actions"><Link to="/join" className="lp-button lp-primary">Start training free<Icon name="arrow" /></Link><a href="#challenges" className="lp-button lp-secondary" onClick={(event) => scrollToSection(event, 'challenges')}>See challenges</a></div>
              <div className="lp-beta-note">Free during beta. No card needed.</div>
              <div className="lp-hero-capabilities"><span><Icon name="weight" />Workout logging</span><span><Icon name="crew" />Crews</span><span><Icon name="chart" />Challenges</span></div>
            </div>
            <div className="lp-app-preview">
              <div className="lp-screen-tabs" role="tablist" aria-label="App preview">
                {SCREENS.map((name, index) => <button key={name} type="button" id={`lp-${name}-tab`} ref={(node) => { tabRefs.current[index] = node }} role="tab" aria-selected={screen === name} aria-controls="lp-screen-panel" tabIndex={screen === name ? 0 : -1} onClick={() => setScreen(name)} onKeyDown={(event) => selectPreviewWithKeyboard(event, index)}>{name === 'train' ? 'Train' : 'Crew'}</button>)}
              </div>
              <div className="lp-phone" id="lp-screen-panel" role="tabpanel" aria-labelledby={`lp-${screen}-tab`} tabIndex={0}><img src={`${import.meta.env.BASE_URL}landing/${screen}.png`} alt={PREVIEW_ALT[screen]} width="390" height="844" decoding="async" /></div>
              <p className="lp-preview-caption"><i aria-hidden="true" />Inside Will Power · <span>{screen === 'train' ? 'workout logging' : 'crews and check-ins'}</span></p>
            </div>
          </section>

          <section id="challenges" className="lp-section lp-challenge-section" aria-labelledby="challenge-heading">
            <div className="lp-challenge-intro"><div className="lp-eyebrow"><span className="lp-dash" />Challenges</div><h2 id="challenge-heading">Pick your next challenge.</h2><p className="lp-section-copy">A shared goal. A finish date. A reason to keep showing up. Join a round and see how you do.</p><Link className="lp-text-link" to="/join">Join free and explore<Icon name="arrow" /></Link></div>
            <div className="lp-challenge-list">
              {featuredChallenges.map((item) => {
                const copy = CHALLENGE_COPY[item.id]
                return <button key={item.id} type="button" className="lp-challenge-row" aria-haspopup="dialog" onClick={(event) => { challengeTrigger.current = event.currentTarget; setChallenge(item) }}>
                  <span className="lp-challenge-icon">{copy.icon === 'steps' ? <StepsIcon /> : <Icon name={copy.icon} />}</span>
                  <span className="lp-challenge-copy"><span className="lp-challenge-name">{item.name}</span><span className="lp-challenge-description">{copy.summary}</span><span className="lp-challenge-period">{CHALLENGE_PERIOD[item.period]} · {item.unit}</span></span>
                  <Icon name="arrow" />
                </button>
              })}
              <div className="lp-create-challenge"><Icon name="plus" /><p><b>Make it your own.</b> Create a 7, 14, or 30-day challenge and <Link to="/join">invite your friends</Link>.</p></div>
            </div>
          </section>

          <section id="crews" className="lp-section lp-crew-section" aria-labelledby="crew-heading">
            <div className="lp-crew-visual"><div className="lp-visual-title"><Icon name="crew" />Your crew, inside the app</div><div className="lp-phone"><img src={`${import.meta.env.BASE_URL}landing/crew.png`} alt={PREVIEW_ALT.crew} width="390" height="844" loading="lazy" decoding="async" /></div></div>
            <div className="lp-crew-copy"><div className="lp-eyebrow"><span className="lp-dash" />Crews</div><h2 id="crew-heading">Train with people who train when you do.</h2><p className="lp-section-copy">Early mornings, lunch breaks, or after work. Find a crew that fits your routine and your goals.</p><div className="lp-crew-checks"><div><Icon name="check" /><p><b>Check in before you train.</b>See who’s planning to show up today.</p></div><div><Icon name="check" /><p><b>Share your workout after.</b>Post a session, photos, or a quick update.</p></div><div><Icon name="check" /><p><b>Keep each other going.</b>Follow along and celebrate the work.</p></div></div><Link className="lp-text-link" to="/join">Find your crew<Icon name="arrow" /></Link><div className="lp-crew-names">{featuredCrews.map((crew) => <span key={crew.id}>{crew.name}</span>)}</div></div>
          </section>

          <section id="the-app" className="lp-section lp-training-section" aria-labelledby="app-heading">
            <div><div className="lp-eyebrow"><span className="lp-dash" />The workout app</div><h2 id="app-heading">Know what to do.<br />See what you’ve done.</h2><p className="lp-section-copy">Your workout plan, set history, and progress in one place. Built to use between sets.</p><div className="lp-secondary-features"><span><Icon name="food" />Nutrition targets</span><span><Icon name="clock" />Rest timer</span><span>Siri &amp; Apple Shortcuts</span></div></div>
            <div className="lp-training-details"><div className="lp-training-detail"><Icon name="weight" /><div><h3>A workout that fits your setup.</h3><p>Get a session based on your goal, equipment, and training history. Log weights and reps as you go.</p></div></div><div className="lp-training-detail"><Icon name="arrow" /><div><h3>Your next lift, with context.</h3><p>Use your last session to see when to add weight, add reps, or repeat.</p></div></div><div className="lp-training-detail"><Icon name="chart" /><div><h3>Progress you can look back on.</h3><p>See workout history, strength trends, and progress photos as you build consistency.</p></div></div></div>
          </section>

          <section className="lp-getting-started" aria-label="Getting started"><div className="lp-step"><span className="lp-step-number">01</span><div><h3>Set up your training.</h3><p>Choose your goal, days, and equipment.</p></div></div><div className="lp-step"><span className="lp-step-number">02</span><div><h3>Find your crew.</h3><p>Meet people with a routine like yours.</p></div></div><div className="lp-step"><span className="lp-step-number">03</span><div><h3>Start your first session.</h3><p>Log your sets and pick a challenge.</p></div></div></section>

          <section className="lp-membership-section" aria-labelledby="membership-heading"><div><div className="lp-eyebrow"><span className="lp-dash" />Start today</div><h2 id="membership-heading">Free during beta.</h2><p className="lp-section-copy">Workouts, crews, and the challenges above are available now. No card needed to get started.</p><Link to="/join" className="lp-button lp-primary">Start training free<Icon name="arrow" /></Link></div><div className="lp-membership-future"><span className="lp-planned-label">Planned for later</span><div><h3>Optional subscriptions</h3><p>Membership features and pricing are still being developed.</p></div><div><h3>Paid challenges</h3><p>Future events with their own entry details. Paid entry is not available yet.</p></div></div></section>
        </main>

        <footer className="lp-site-footer"><a className="lp-brand" href="#top" onClick={(event) => scrollToSection(event, 'top')}><Logo size={24} />WILL POWER</a><span className="lp-copyright">© {new Date().getFullYear()} Will Power Fitness</span><div className="lp-footer-links"><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link></div></footer>
      </div>

      <dialog ref={dialogRef} className="lp-dialog" aria-labelledby="lp-dialog-title" aria-describedby="lp-dialog-rules" aria-modal="true" onClose={() => setChallenge(null)} onCancel={(event) => { event.preventDefault(); setChallenge(null) }} onKeyDown={dialogKeyboard} onClick={(event) => {
        if (event.target !== event.currentTarget) return
        const bounds = event.currentTarget.getBoundingClientRect()
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) setChallenge(null)
      }}>
        <div className="lp-dialog-heading"><h2 id="lp-dialog-title">{challenge?.name}</h2><button type="button" className="lp-dialog-close" aria-label="Close challenge details" onClick={() => setChallenge(null)}><Icon name="close" /></button></div>
        <p className="lp-dialog-duration">{challenge ? `${CHALLENGE_DURATION[challenge.period]}${challenge.period === 'biweek' ? '' : ` · ${challenge.unit}`}` : ''}</p>
        <p id="lp-dialog-rules">{challenge ? challengeRules(challenge) : ''}</p>
        <Link to="/join" className="lp-button lp-primary">Join free and explore<Icon name="arrow" /></Link>
        <span className="lp-beta-note">Free during beta. No card needed.</span>
      </dialog>
    </div>
  )
}
