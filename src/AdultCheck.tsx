import { useState } from 'react'
import { useApp } from './store'

/**
 * The one question for accounts made before profiles were split by age: are you 18 or older? Yes makes the profile public (their posts
 * show in Explore); No (13 to 17) stays private, with the choice in Settings. Nothing about a birthday is asked or kept. Until it is
 * answered the profile stays private. On Home it can be put off ("Not now"); in Settings it sits where the switch would be.
 */
export function AdultCheck({ compact }: { compact?: boolean }) {
  const { update } = useApp()
  const [later, setLater] = useState(false)
  if (later) return null
  const answer = (adult: boolean) => update((d) => adult
    ? { ...d, adult: true, profilePublic: true, publicDefault: true, publicNotice: true }
    : { ...d, adult: false, profilePublic: false, publicDefault: true, publicNotice: false })
  return (
    <section className={compact ? 'age-check compact' : 'card age-check'} role="group" aria-label="Are you 18 or older?">
      <b>Are you 18 or older?</b>
      <p className="small mute">Profiles of people 18 and older are public, and their posts show in Explore for everyone on Will Power. If you are 13 to 17, your profile stays private, and you can choose to make it public later.</p>
      <div className="row wrap">
        <button type="button" className="primary small-btn" onClick={() => answer(true)}>Yes, I’m 18 or older</button>
        <button type="button" className="ghost small-btn" onClick={() => answer(false)}>No, I’m 13 to 17</button>
        {!compact && <button type="button" className="quiet-action" onClick={() => setLater(true)}>Not now</button>}
      </div>
    </section>
  )
}
