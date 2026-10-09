import { useEffect, useState } from 'react'
import { useApp } from '../store'
import SocialTabs from '../SocialTabs'
import { allCommunities } from './Crew'
import { MAX_CREWS } from './Communities'
import { cloudEnabled, fetchFriends, findByEmails, findByHandle, followCloud, joinCrewCloud, saveMyDiscovery, unfollowCloud, type PublicProfile } from '../cloud'
import { streak } from '../engine'

type ContactPicker = { select: (props: string[], opts: { multiple: boolean }) => Promise<{ email?: string[] }[]> }

export default function Friends() {
  const { data, update, userId, email } = useApp()
  const all = allCommunities(data.custom)
  const [handle, setHandle] = useState(data.handle ?? '')
  const [msg, setMsg] = useState('')
  const [q, setQ] = useState('')
  const [results, setResults] = useState<PublicProfile[] | null>(null)
  const [friends, setFriends] = useState<(PublicProfile & { crews: string[] })[]>([])
  const [copied, setCopied] = useState(false)
  const canPickContacts = typeof navigator !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window

  const load = () => { if (userId) void fetchFriends(userId).then(setFriends) }
  useEffect(load, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  const link = `${location.origin}${location.pathname}#/join?${[data.handle ? `ref=${encodeURIComponent(data.handle)}` : '', data.primary ? `crew=${encodeURIComponent(data.primary)}` : ''].filter(Boolean).join('&')}`
  const share = async () => {
    const text = 'Train with me on Will Power Fitness. Wake Up. Show Up. Lift.'
    try { if (navigator.share) { await navigator.share({ title: 'Will Power Fitness', text, url: link }); return } } catch { /* cancelled */ }
    try { await navigator.clipboard.writeText(link); setCopied(true) } catch { setMsg(link) }
  }

  const saveCard = async (next: { handle?: string; findByHandle?: boolean; findByEmail?: boolean }) => {
    const h = (next.handle ?? handle).toLowerCase()
    const fh = next.findByHandle ?? data.findByHandle ?? false
    const fe = next.findByEmail ?? data.findByEmail ?? false
    if (!/^[a-z0-9_]{3,20}$/.test(h)) { setMsg('Handles are 3 to 20 letters, numbers, or underscores.'); return }
    if (userId) {
      const err = await saveMyDiscovery(userId, { handle: h, name: data.name || 'Member', findByHandle: fh, findByEmail: fe, email })
      if (err) { setMsg(err); return }
    }
    update((d) => ({ ...d, handle: h, findByHandle: fh, findByEmail: fe }))
    setMsg('Saved.')
  }

  const search = async () => { if (q.trim().length >= 2 && cloudEnabled) setResults(await findByHandle(q.trim().replace(/^@/, ''))) }
  const pick = async () => {
    try {
      const contacts = await (navigator as unknown as { contacts: ContactPicker }).contacts.select(['email'], { multiple: true })
      const emails = contacts.flatMap((c) => c.email ?? [])
      setResults(emails.length ? await findByEmails(emails) : [])
    } catch { setMsg('Could not read contacts.') }
  }
  const follow = async (p: PublicProfile) => { if (userId) { await followCloud(userId, p.userId); load(); setMsg(`You’re following @${p.handle}.`) } }
  const joinTheirCrew = (id: string) => {
    if (data.joined.includes(id)) return
    if (data.joined.length >= MAX_CREWS) { setMsg(`You’re in ${MAX_CREWS} crews already. Leave one on the Feed tab first.`); return }
    update((d) => ({ ...d, joined: [...d.joined, id], primary: d.primary ?? id }))
    if (userId) void joinCrewCloud(id, userId, data.name || 'Member', streak(data))
    setMsg('Joined!')
  }
  const crewName = (id: string) => all.find((c) => c.id === id)?.name ?? id

  return (
    <>
      <SocialTabs />
      <div><h1>Find friends</h1><p className="mute">Train with people you know. Everything here is opt-in.</p></div>

      <section className="card hero">
        <h2>Invite a friend</h2>
        <p className="small mute">Send your link. {data.primary ? 'They’ll see your crew as their first suggestion.' : 'They’ll join the free beta.'}</p>
        <button className="primary" onClick={() => void share()}>📤 Share my invite link</button>
        {copied && <p className="small ok-text">Link copied.</p>}
      </section>

      <section className="card">
        <h2>Your handle</h2>
        <p className="small mute">A short name friends can search for. Nobody can find you unless you turn it on.</p>
        <div className="row"><input value={handle} onChange={(e) => setHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))} placeholder="e.g. will_lifts" maxLength={20} /><button className="primary" onClick={() => void saveCard({ handle })}>Save</button></div>
        <button className="row full" style={{ background: 'var(--card2)' }} onClick={() => void saveCard({ findByHandle: !data.findByHandle })}><span>Let people find me by handle</span><span className={`tag ${data.findByHandle ? 'ok' : ''}`}>{data.findByHandle ? 'On' : 'Off'}</span></button>
        <button className="row full" style={{ background: 'var(--card2)', textAlign: 'left' }} onClick={() => void saveCard({ findByEmail: !data.findByEmail })}><span>Let people who already have my email find me<br /><span className="small mute">We store a scrambled version of your email, never the email itself.</span></span><span className={`tag ${data.findByEmail ? 'ok' : ''}`}>{data.findByEmail ? 'On' : 'Off'}</span></button>
        {msg && <p className="small ok-text">{msg}</p>}
      </section>

      <section className="card">
        <h2>Find people</h2>
        {!cloudEnabled && <div className="banner">Searching needs a live account. It works once the backend is connected.</div>}
        <div className="row"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by @handle" onKeyDown={(e) => e.key === 'Enter' && void search()} /><button className="primary" onClick={() => void search()} disabled={!cloudEnabled}>Search</button></div>
        {canPickContacts
          ? <button className="ghost" onClick={() => void pick()} disabled={!cloudEnabled}>📇 Find friends from my contacts</button>
          : <p className="small mute">📇 Contact matching isn’t available in this browser. iPhones only allow it in the App Store app, which is on the roadmap. Invite links and handles work today.</p>}
        {results && results.length === 0 && <p className="small mute">No one found. They may not be on Will Power yet or have turned discovery off. Send them your invite link.</p>}
        {results?.filter((r) => r.userId !== userId).map((r) => (
          <div className="person" key={r.userId}><span className="avatar">{r.name[0]}</span><span className="grow"><b>{r.name.split(' ')[0]}</b> <span className="small mute">@{r.handle}</span></span><button className="primary small-btn" onClick={() => void follow(r)}>Follow</button></div>
        ))}
      </section>

      {friends.length > 0 && (
        <section className="card">
          <h2>Your friends</h2>
          {friends.map((f) => (
            <div key={f.userId} style={{ display: 'grid', gap: 6 }}>
              <div className="person"><span className="avatar">{f.name[0]}</span><span className="grow"><b>{f.name.split(' ')[0]}</b> <span className="small mute">@{f.handle}</span></span><button className="ghost small-btn" onClick={() => userId && void unfollowCloud(userId, f.userId).then(load)}>Unfollow</button></div>
              <div className="chips">{f.crews.length === 0 ? <span className="small mute">Not in a crew yet</span> : f.crews.map((id) => <button key={id} className={`chip ${data.joined.includes(id) ? 'on' : ''}`} onClick={() => joinTheirCrew(id)}>{data.joined.includes(id) ? '✓ ' : '＋ '}{crewName(id)}</button>)}</div>
            </div>
          ))}
        </section>
      )}
    </>
  )
}
