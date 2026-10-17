import { useState } from 'react'
import { useApp } from './store'
import { ConfirmSheet } from './components'
import { AdultCheck } from './AdultCheck'

export const profileLink = (handle: string) => `${location.origin}/u/${handle}`

/** Public profile controls: on/off, bio, and the link to share. Used in Settings. */
export default function ProfileSettings() {
  const { data, update, userId } = useApp()
  const [bio, setBio] = useState(data.bio ?? '')
  const [copied, setCopied] = useState(false)
  const [asking, setAsking] = useState(false) // a teenager turning public on gets one more look first
  const on = !!data.profilePublic
  const link = data.handle ? profileLink(data.handle) : ''
  const copy = async () => { try { await navigator.clipboard.writeText(link); setCopied(true) } catch { /* ignore */ } }
  return (
    <section className="card">
      <h3>Public profile</h3>
      <p className="small mute">{on ? 'Anyone with your link can see your name, photo, bio, streak, calendar, badges, crews, and the posts you make while this is on. Those posts, with their photos and videos, also show in Explore for everyone on Will Power. Your weight and your full workout logs stay private.' : 'Your profile is private. Only people you’re connected with can open it, and your posts stay with your crews.'}</p>
      {userId && data.adult === undefined
        ? <AdultCheck compact />
        : <button className="row full" style={{ background: 'var(--card2)', textAlign: 'left' }} role="switch" aria-checked={on} onClick={() => { if (!on && data.adult === false) setAsking(true); else update((d) => ({ ...d, profilePublic: !on, publicDefault: true, publicNotice: false })) }}>
        <span>Make my profile public<br /><span className="small mute">Posts you make while this is on show on your profile and in Explore. Older posts stay crew-only.</span></span>
        <span className={`tag ${on ? 'ok' : ''}`}>{on ? 'On' : 'Off'}</span>
      </button>}
      {data.adult === false && <p className="small mute">You are under 18, so your profile starts private. If you turn it on, anyone on Will Power can see your posts in Explore, and anyone with your link can see your profile. Talk to a parent or guardian first.</p>}
      {asking && <ConfirmSheet title="Make your profile public?" message="Anyone on Will Power will be able to see your posts in Explore, and anyone with your link will be able to see your profile. You can switch this off again any time. Talk to a parent or guardian before you do this." confirmLabel="Yes, make it public" onConfirm={() => { setAsking(false); update((d) => ({ ...d, profilePublic: true, publicDefault: true, publicNotice: false })) }} onCancel={() => setAsking(false)} />}
      <label>Bio ({bio.length}/160)<textarea rows={2} maxLength={160} value={bio} onChange={(e) => setBio(e.target.value)} onBlur={() => update((d) => ({ ...d, bio: bio.trim() || undefined }))} placeholder="Dad of 3, 5 AM lifter, Woodbridge" /></label>
      {on && link && <div className="row"><code className="small" style={{ wordBreak: 'break-all' }}>{link}</code><button className="ghost small-btn" onClick={() => void copy()}>{copied ? 'Copied' : 'Copy'}</button></div>}
      {on && !link && <p className="small mute">Set a handle on the Friends tab to get a link.</p>}
    </section>
  )
}
