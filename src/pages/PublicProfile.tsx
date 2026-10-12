import { useEffect, useState } from 'react'
import { Logo } from '../App'
import ProfileView from '../ProfileView'
import { allCommunities } from './Crew'
import { cloudEnabled, fetchProfileByHandle, fetchUserPosts, type Person, type PublicPost } from '../cloud'

const setMeta = (attr: 'name' | 'property', key: string, content: string) => {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el) }
  el.setAttribute('content', content)
}

/** A profile page for anyone with the link, signed in or not. Only shows profiles whose owner made them public. */
export default function PublicProfile({ handle }: { handle: string }) {
  const [person, setPerson] = useState<Person | null | undefined>(undefined)
  const [posts, setPosts] = useState<PublicPost[] | null>(null)
  const crews = allCommunities([])
  const crewName = (id: string) => crews.find((c) => c.id === id)?.name ?? 'A crew'

  useEffect(() => {
    if (!cloudEnabled) { setPerson(null); return }
    let alive = true
    void fetchProfileByHandle(handle).then((p) => {
      if (!alive) return
      const visible = p && p.isPublic ? p : null
      setPerson(visible)
      if (visible) void fetchUserPosts(visible.userId).then((x) => { if (alive) setPosts(x) })
    }).catch(() => alive && setPerson(null))
    return () => { alive = false }
  }, [handle])

  useEffect(() => {
    if (!person) { document.title = 'Profile · Will Power'; return }
    const title = `${person.name} (@${person.handle}) · Will Power`
    const desc = person.bio || `${person.name} trains with a crew on Will Power. ${person.stats?.streak ?? 0}-day streak, ${person.stats?.workoutsTotal ?? 0} workouts.`
    document.title = title
    setMeta('name', 'description', desc)
    setMeta('property', 'og:title', title)
    setMeta('property', 'og:description', desc)
    setMeta('property', 'og:url', `${location.origin}/u/${person.handle}`)
    if (person.avatar && person.avatar.startsWith('https://')) setMeta('property', 'og:image', person.avatar)
  }, [person])

  const join = `/#/join?${person ? `ref=${encodeURIComponent(person.handle ?? '')}&u=${person.userId}` : ''}`
  return (
    <div className="auth" style={{ alignContent: 'start', gap: 14 }}>
      <div className="row"><a href="/" className="brand" style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Logo size={30} /><b>Will Power</b></a><a className="primary small-btn" href={join} style={{ textDecoration: 'none' }}>Join free</a></div>
      {person === undefined && <p className="mute">Loading…</p>}
      {person === null && <section className="card"><h2>Profile not found</h2><p className="small mute">This profile is private or doesn’t exist.</p><a className="primary" href="/" style={{ textDecoration: 'none', textAlign: 'center' }}>Go to Will Power</a></section>}
      {person && (
        <>
          <ProfileView name={person.name} handle={person.handle} avatar={person.avatar} bio={person.bio} followers={person.followers} following={person.following} stats={person.stats} posts={posts} crewName={crewName} emptyPosts="No public posts yet."
            actions={<a className="primary" href={join} style={{ textDecoration: 'none' }}>Join {person.name.split(' ')[0]} on Will Power</a>} />
          <p className="small mute" style={{ textAlign: 'center' }}>Wake Up. Show Up. Lift.</p>
        </>
      )}
    </div>
  )
}
