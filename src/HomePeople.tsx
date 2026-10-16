import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from './store'
import { Avatar } from './components'
import { Icon } from './icons'
import { cloudEnabled, fetchConnections, followCloud, type Person } from './cloud'
import { useInvite } from './useInvite'

type Suggested = Person & { why: string }

/**
 * Right above the feed on Home: athletes you might follow (people who already follow you, then people in your crews), and the
 * way to invite a friend. Needs an account online to suggest anyone; the invite always works.
 */
export function HomePeople() {
  const { data, userId } = useApp()
  const invite = useInvite()
  const [people, setPeople] = useState<Suggested[]>([])
  const [done, setDone] = useState<string[]>([]) // followed just now
  const [err, setErr] = useState('')
  const crewKey = data.joined.join(',')
  useEffect(() => {
    if (!userId || !cloudEnabled) return
    let alive = true
    void fetchConnections(userId, data.joined).then((c) => {
      if (!alive) return
      setPeople([
        ...c.followers.map((p) => ({ ...p, why: 'Follows you' })),
        ...c.suggestions.map((p) => ({ ...p, why: 'In your crew' })),
      ].slice(0, 12))
    }).catch(() => {})
    return () => { alive = false }
  }, [userId, crewKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const follow = async (p: Suggested) => {
    if (!userId) return
    setErr('')
    try { await followCloud(userId, p.userId); setDone((d) => [...d, p.userId]) } catch { setErr('Could not follow right now. Try again.') }
  }
  const inviteCard = (
    <div className="person-card invite-card">
      <span className="icon-surface"><Icon name="plus" /></span>
      <b>Invite friends</b>
      <span className="small mute">Send your link. You follow each other when they join.</span>
      <button type="button" className="primary small-btn" onClick={() => void invite.share()}>Invite</button>
    </div>
  )

  return (
    <section className="home-people" aria-label="Suggested athletes and invites">
      <div className="section-head"><h2>{people.length ? 'Suggested athletes' : 'Invite friends'}</h2>{userId && cloudEnabled && <Link to="/friends?tab=find" className="quiet-action">Find more<Icon name="chevron" size={16} /></Link>}</div>
      <div className="people-row">
        {people.map((p) => {
          const followed = done.includes(p.userId)
          return (
            <div className="person-card" key={p.userId}>
              <Link to={`/friend/${p.userId}`} className="person-card-who" aria-label={`Open ${p.name.split(' ')[0]}'s profile`}>
                <Avatar name={p.name} url={p.avatar} />
                <b>{p.name.split(' ')[0]}</b>
                <span className="small mute">{p.why}{p.streak > 1 ? ` · ${p.streak}-day streak` : ''}</span>
              </Link>
              {followed
                ? <span className="tag ok person-card-done"><Icon name="check" size={14} />Following</span>
                : <button type="button" className="primary small-btn" onClick={() => void follow(p)}>{p.why === 'Follows you' ? 'Follow back' : 'Follow'}</button>}
            </div>
          )
        })}
        {inviteCard}
      </div>
      {invite.copied && <p className="small ok-text" role="status">Invite link copied. Send it to a friend.</p>}
      {invite.showLink && <input className="social-invite-url" readOnly value={invite.link} aria-label="Your invite link" onFocus={(e) => e.currentTarget.select()} />}
      {err && <p className="small err" role="alert">{err}</p>}
    </section>
  )
}
