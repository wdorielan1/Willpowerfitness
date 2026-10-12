import { useState } from 'react'
import { useApp } from './store'

export const profileLink = (handle: string) => `${location.origin}/u/${handle}`

/** Public profile controls: on/off, bio, and the link to share. Used in Settings. */
export default function ProfileSettings() {
  const { data, update } = useApp()
  const [bio, setBio] = useState(data.bio ?? '')
  const [copied, setCopied] = useState(false)
  const on = !!data.profilePublic
  const link = data.handle ? profileLink(data.handle) : ''
  const copy = async () => { try { await navigator.clipboard.writeText(link); setCopied(true) } catch { /* ignore */ } }
  return (
    <section className="card">
      <h3>Public profile</h3>
      <p className="small mute">{on ? 'Anyone with your link can see your name, photo, bio, streak, calendar, badges, crews, and the posts you make while this is on. Your weight, photos and workout details stay private.' : 'Your profile is private. Only people you’re connected with can open it.'}</p>
      <button className="row full" style={{ background: 'var(--card2)', textAlign: 'left' }} role="switch" aria-checked={on} onClick={() => update((d) => ({ ...d, profilePublic: !on }))}>
        <span>Make my profile public<br /><span className="small mute">Posts you make while this is on also show on your profile. Older posts stay crew-only.</span></span>
        <span className={`tag ${on ? 'ok' : ''}`}>{on ? 'On' : 'Off'}</span>
      </button>
      <label>Bio ({bio.length}/160)<textarea rows={2} maxLength={160} value={bio} onChange={(e) => setBio(e.target.value)} onBlur={() => update((d) => ({ ...d, bio: bio.trim() || undefined }))} placeholder="Dad of 3, 5 AM lifter, Woodbridge" /></label>
      {on && link && <div className="row"><code className="small" style={{ wordBreak: 'break-all' }}>{link}</code><button className="ghost small-btn" onClick={() => void copy()}>{copied ? 'Copied' : 'Copy'}</button></div>}
      {on && !link && <p className="small mute">Set a handle on the Friends tab to get a link.</p>}
    </section>
  )
}
