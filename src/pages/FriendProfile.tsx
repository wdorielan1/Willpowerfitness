import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useApp } from '../store'
import ProfileView from '../ProfileView'
import { CommentThread } from '../Comments'
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
  const all = allCommunities(data.custom)
  const load = () => { if (userId && cloudEnabled) void fetchPerson(userId, id).then(setP).catch(() => setP(null)); else setP(null) }
  useEffect(load, [userId, id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (cloudEnabled && id) void fetchUserPosts(id).then(setPosts) }, [id])

  const joinTheirCrew = (crewId: string) => {
    if (data.joined.includes(crewId)) return
    if (data.joined.length >= MAX_CREWS) { setMsg(`You’re in ${MAX_CREWS} crews already. Leave one on the Feed tab first.`); return }
    update((d) => ({ ...d, joined: [...d.joined, crewId], primary: d.primary ?? crewId }))
    if (userId) void joinCrewCloud(crewId, userId, data.name || 'Member', streak(data))
    setMsg('Joined!')
  }
  const toggle = async () => { if (!userId || !p) return; if (p.iFollow) await unfollowCloud(userId, p.userId); else await followCloud(userId, p.userId); load() }
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
          <ProfileView
            name={p.name} handle={p.handle} avatar={p.avatar} bio={p.bio} followers={p.followers} following={p.following} stats={{ ...stats, crews: p.crews.length ? p.crews : stats?.crews }} posts={posts}
            crewName={(c) => all.find((x) => x.id === c)?.name ?? c}
            onCrew={joinTheirCrew} crewJoined={(c) => data.joined.includes(c)}
            emptyPosts="No posts to show."
            renderPost={(x) => userId ? <CommentThread postId={x.id} count={x.comments} me={{ id: userId }} postMine={p.userId === userId} /> : null}
            actions={p.userId === userId ? null : <>
              <button className={p.iFollow ? 'ghost' : 'primary'} onClick={() => void toggle()}>{p.iFollow ? 'Unfollow' : p.followsMe ? 'Follow back' : 'Follow'}</button>
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
