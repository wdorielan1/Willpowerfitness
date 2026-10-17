import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useApp } from '../store'
import ProfileView from '../ProfileView'
import { profileLink } from '../ProfileSettings'
import { cloudEnabled, fetchPerson, fetchUserPosts, followCloud, joinCrewCloud, unfollowCloud, type Person, type PublicPost } from '../cloud'
import { allCommunities } from './Crew'
import { MAX_CREWS } from './Communities'
import { streak } from '../engine'

export default function FriendProfile() {
  const { id = '' } = useParams()
  const { data, update, userId } = useApp()
  const [p, setP] = useState<Person | null | undefined>(undefined)
  const [posts, setPosts] = useState<PublicPost[] | null>(null)
  const [msg, setMsg] = useState('')
  const [postsError, setPostsError] = useState('')
  const [retry, setRetry] = useState(0)
  const [followingBusy, setFollowingBusy] = useState(false)
  const all = allCommunities(data.custom)
  useEffect(() => {
    let alive = true
    setP(undefined); setPosts(null); setPostsError(''); setMsg('')
    if (userId && cloudEnabled) {
      void fetchPerson(userId, id).then((x) => { if (alive) setP(x) }).catch(() => { if (alive) setP(null) })
      void fetchUserPosts(id).then((x) => { if (alive) setPosts(x) }).catch(() => { if (alive) setPostsError('Could not load posts.') })
    } else { setP(null); setPosts([]) }
    return () => { alive = false }
  }, [userId, id, retry])

  const joinTheirCrew = (crewId: string) => {
    if (data.joined.includes(crewId)) return
    if (data.joined.length >= MAX_CREWS) { setMsg(`You’re in ${MAX_CREWS} crews already. Leave one on the Feed tab first.`); return }
    update((d) => ({ ...d, joined: [...d.joined, crewId], primary: d.primary ?? crewId }))
    if (userId) void joinCrewCloud(crewId, userId, data.name || 'Member', streak(data))
    setMsg('Joined!')
  }
  const toggle = async () => {
    if (!userId || !p || followingBusy) return
    const person = p
    setFollowingBusy(true)
    try {
      if (person.iFollow) await unfollowCloud(userId, person.userId)
      else await followCloud(userId, person.userId)
      const refreshed = await fetchPerson(userId, person.userId)
      setP((current) => current?.userId === person.userId ? refreshed : current)
    } catch { setMsg('Could not update following. Please try again.') }
    finally { setFollowingBusy(false) }
  }
  const share = async () => {
    if (!p?.handle) return
    const url = profileLink(p.handle)
    try { if (navigator.share) { await navigator.share({ title: `${p.name} on Will Power`, url }); return } } catch { return /* cancelled */ }
    try { await navigator.clipboard.writeText(url); setMsg('Profile link copied.') } catch { setMsg(url) }
  }
  const stats = p ? (p.stats ?? { streak: p.streak, crews: p.crews }) : null

  return (
    <div className="friends-page">
      <p><Link to="/friends" className="small mute">← Friends</Link></p>
      {p === undefined && <p className="mute">Loading…</p>}
      {p === null && <section className="card"><h2>Profile not found</h2><p className="small mute">This person may have left, or you’re offline.</p></section>}
      {p && (
        <>
          <ProfileView key={id}
            name={p.name} handle={p.handle} avatar={p.avatar} bio={p.bio} followers={p.followers} following={p.following} stats={{ ...stats, crews: p.crews.length ? p.crews : stats?.crews }} posts={posts}
            crewName={(c) => all.find((x) => x.id === c)?.name ?? c}
            onCrew={joinTheirCrew} crewJoined={(c) => data.joined.includes(c)}
            emptyPosts="No posts to show." postsError={postsError} onRetryPosts={() => setRetry((n) => n + 1)}
            actions={p.userId === userId ? null : <>
              <button className={p.iFollow ? 'ghost' : 'primary'} disabled={followingBusy} onClick={() => void toggle()}>{followingBusy ? 'Updating…' : p.iFollow ? 'Unfollow' : p.followsMe ? 'Follow back' : 'Follow'}</button>
              {p.isPublic && p.handle && <button className="ghost" onClick={() => void share()}>Share profile</button>}
            </>}
          />
          {p.iFollow && p.followsMe && <p className="small mute" style={{ textAlign: 'center' }}>You follow each other.</p>}
          {msg && <p className="social-feedback" role="status">{msg}</p>}
        </>
      )}
    </div>
  )
}
