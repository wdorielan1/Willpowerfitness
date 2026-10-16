import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../icons'
import { useApp } from '../store'
import ProfileView from '../ProfileView'
import { CommentThread } from '../Comments'
import { profileLink } from '../ProfileSettings'
import { computeStats } from '../profileStats'
import { avatarFromFile } from '../photos'
import { cloudEnabled, fetchConnections, fetchUserPosts, type PublicPost } from '../cloud'
import { DAY_NAMES, GOALS, LEVELS } from '../data'
import { fmtTime } from '../engine'
import { allCommunities, useCrew } from './Crew'

export default function Profile() {
  const { data, email, logOut, avatarUrl, googlePhoto, setAvatar, userId } = useApp()
  const p = data.profile!
  const crew = useCrew()
  const all = allCommunities(data.custom)
  const file = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')
  const [posts, setPosts] = useState<PublicPost[] | null>(null)
  const postCount = data.posts.length
  const [counts, setCounts] = useState<{ followers: number; following: number } | null>(null)
  useEffect(() => {
    if (cloudEnabled && userId) void fetchConnections(userId, []).then((c) => setCounts({ followers: c.friends.length + c.followers.length, following: c.friends.length + c.following.length })).catch(() => {})
  }, [userId])
  useEffect(() => {
    if (cloudEnabled && userId) void fetchUserPosts(userId).then(setPosts)
    else setPosts(data.posts.filter((x) => x.mine).map((x) => ({ id: x.id, crewId: x.crewId, kind: x.kind, text: x.text, ts: x.ts, hasPhoto: !!(x.imagePaths?.length || x.imageIds?.length), isPublic: false })))
  }, [userId, postCount]) // eslint-disable-line react-hooks/exhaustive-deps
  const pick = async (f: File | undefined) => {
    if (!f) return
    try { setAvatar(await avatarFromFile(f)); setMsg('Photo updated.') } catch (e) { setMsg(e instanceof Error ? e.message : 'Could not use that photo.') }
  }
  const share = async () => {
    if (!data.handle) { setMsg('Set a handle on the Friends tab first.'); return }
    if (!data.profilePublic) { setMsg('Turn on Public profile in Settings first, or the link will show “Profile not found”.'); return }
    const url = profileLink(data.handle)
    try { if (navigator.share) { await navigator.share({ title: `${data.name} on Will Power`, text: 'Train with me on Will Power.', url }); return } } catch { return /* cancelled */ }
    try { await navigator.clipboard.writeText(url); setMsg('Profile link copied.') } catch { setMsg(url) }
  }
  const rows: [string, string][] = [
    ['Goal', GOALS[p.goal]], ['Experience', LEVELS[p.level]], ['Days', p.days.map((d) => DAY_NAMES[d]).join(', ')],
    ['Time', fmtTime(p.time)], ['Equipment', { gym: 'Full gym', db: 'Dumbbells', bw: 'Bodyweight' }[p.gear]],
    ['Weight', `${p.weight} → ${p.target} lb`], ['Cardio', p.cardio ? 'Included' : 'Off'], ['Reminders', p.reminders ? 'On' : 'Off'],
    ['Avoid', p.avoid || '—'], ['Crew', crew?.name ?? 'None'],
  ]
  return (
    <>
      <input ref={file} type="file" accept="image/*" hidden onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = '' }} />
      <ProfileView
        name={data.name} handle={data.handle} avatar={avatarUrl} bio={data.bio} stats={computeStats(data)} posts={posts} showLocked
        followers={counts?.followers ?? (cloudEnabled ? null : 0)} following={counts?.following ?? (cloudEnabled ? null : 0)} countsLink={cloudEnabled}
        crewName={(c) => all.find((x) => x.id === c)?.name ?? c}
        emptyPosts="No posts yet. Post in a crew and it shows here."
        renderPost={(x) => userId ? <CommentThread postId={x.id} count={x.comments} me={{ id: userId }} postMine /> : null}
        actions={<>
          <button className="ghost small-btn" onClick={() => file.current?.click()}>{avatarUrl ? 'Change photo' : 'Add photo'}</button>
          {data.avatar && <button className="ghost small-btn" onClick={() => { setAvatar(null); setMsg(googlePhoto ? 'Back to your Google photo.' : 'Photo removed.') }}>{googlePhoto ? 'Use my Google photo' : 'Remove photo'}</button>}
          <button className="ghost small-btn" onClick={() => void share()}>Share profile</button>
          <Link to="/settings" className="ghost small-btn" style={{ textDecoration: 'none' }}>Edit bio and privacy</Link>
          {msg && <span className="small mute" role="status" style={{ flexBasis: '100%' }}>{msg}</span>}
        </>}
      />
      <p className="small mute" style={{ textAlign: 'center' }}>{data.profilePublic ? 'Your profile is public. Anyone with your link can see it.' : 'Your profile is private.'}</p>

      <Link to="/friends" className="card profile-friends" aria-label="Open Friends">
        <span className="icon-surface"><Icon name="crew" /></span>
        <span className="grow"><b>Friends</b><span className="small mute">{counts ? `${counts.followers} follower${counts.followers === 1 ? '' : 's'} · ${counts.following} following` : 'Followers, following, and who to invite'}</span></span>
        <Icon name="chevron" />
      </Link>
      <section className="card">
        <h3>Your details</h3>
        <span className="small mute">{email}</span>
        {rows.map(([k, v]) => <div key={k} className="row small"><span className="mute">{k}</span><b>{v}</b></div>)}
        <Link to="/settings" className="btn ghost">Change these in Settings</Link>
      </section>
      <section className="card">
        <h3>Plans</h3>
        <p className="small mute">Will Power is free during beta. Pro, premium 5 AM Club, paid challenges and coaching are coming later.</p>
        <span className="tag ok">Free beta</span>
      </section>
      <Link to="/privacy" className="small mute" style={{ textAlign: 'center', textDecoration: 'underline' }}>Privacy Policy</Link>
      <Link to="/terms" className="small mute" style={{ textAlign: 'center', textDecoration: 'underline' }}>Terms of Service</Link>
      <button className="ghost" onClick={logOut}>Log out</button>
    </>
  )
}
