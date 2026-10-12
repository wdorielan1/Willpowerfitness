import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useApp } from '../store'
import { Avatar } from '../components'
import { cloudEnabled, fetchPerson, followCloud, joinCrewCloud, unfollowCloud, type Person } from '../cloud'
import { allCommunities } from './Crew'
import { MAX_CREWS } from './Communities'
import { streak } from '../engine'

export default function FriendProfile() {
  const { id = '' } = useParams()
  const { data, update, userId } = useApp()
  const [p, setP] = useState<Person | null | undefined>(undefined)
  const [msg, setMsg] = useState('')
  const all = allCommunities(data.custom)
  const load = () => { if (userId && cloudEnabled) void fetchPerson(userId, id).then(setP).catch(() => setP(null)); else setP(null) }
  useEffect(load, [userId, id]) // eslint-disable-line react-hooks/exhaustive-deps

  const joinTheirCrew = (crewId: string) => {
    if (data.joined.includes(crewId)) return
    if (data.joined.length >= MAX_CREWS) { setMsg(`You’re in ${MAX_CREWS} crews already. Leave one on the Feed tab first.`); return }
    update((d) => ({ ...d, joined: [...d.joined, crewId], primary: d.primary ?? crewId }))
    if (userId) void joinCrewCloud(crewId, userId, data.name || 'Member', streak(data))
    setMsg('Joined!')
  }
  const toggle = async () => { if (!userId || !p) return; if (p.iFollow) await unfollowCloud(userId, p.userId); else await followCloud(userId, p.userId); load() }

  return (
    <div className="friends-page">
      <p><Link to="/friends" className="small mute">← Friends</Link></p>
      {p === undefined && <p className="mute">Loading…</p>}
      {p === null && <section className="card"><h2>Profile not found</h2><p className="small mute">This person may have left, or you’re offline.</p></section>}
      {p && (
        <>
          <section className="card">
            <div className="person"><Avatar name={p.name} url={p.avatar} size={52} /><span className="grow"><b>{p.name.split(' ')[0]}</b> {p.handle && <span className="small mute">@{p.handle}</span>}<br /><span className="small mute">{p.iFollow && p.followsMe ? 'Friends' : p.iFollow ? 'You follow them' : p.followsMe ? 'Follows you' : 'Not connected yet'}</span></span></div>
            {p.userId !== userId && <button className={p.iFollow ? 'ghost' : 'primary'} onClick={() => void toggle()}>{p.iFollow ? 'Unfollow' : p.followsMe ? 'Follow back' : 'Follow'}</button>}
          </section>
          <section className="card">
            <h2>Streak</h2>
            <p>{p.streak > 0 ? `${p.streak} day${p.streak === 1 ? '' : 's'} in a row` : 'No streak yet'}</p>
          </section>
          <section className="card">
            <h2>Crews</h2>
            <div className="chips">{p.crews.length === 0 ? <span className="small mute">Not in a crew yet</span> : p.crews.map((c) => <button key={c} className={`chip ${data.joined.includes(c) ? 'on' : ''}`} onClick={() => joinTheirCrew(c)}>{data.joined.includes(c) ? '✓ ' : '＋ '}{all.find((x) => x.id === c)?.name ?? c}</button>)}</div>
            {msg && <p className="social-feedback" role="status">{msg}</p>}
          </section>
        </>
      )}
    </div>
  )
}
