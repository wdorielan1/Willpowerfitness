import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../store'
import { Icon } from '../icons'
import { Avatar } from '../components'
import SocialTabs from '../SocialTabs'
import { allCommunities } from './Crew'
import { MAX_CREWS } from './Communities'
import { cloudEnabled, ensureProfileCard, fetchConnections, findByEmails, findByHandle, followCloud, joinCrewCloud, saveMyDiscovery, unfollowCloud, type Person, type PublicProfile } from '../cloud'
import { streak } from '../engine'

type ContactPicker = { select: (props: string[], opts: { multiple: boolean }) => Promise<{ email?: string[] }[]> }

export default function Friends() {
  const { data, update, userId, email } = useApp()
  const all = allCommunities(data.custom)
  const suggestHandle = () => `${(data.name || 'lifter').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 14) || 'lifter'}${Math.floor(100 + Math.random() * 900)}`
  const [handle, setHandle] = useState(data.handle ?? suggestHandle())
  const [msg, setMsg] = useState('')
  const [q, setQ] = useState('')
  const [results, setResults] = useState<PublicProfile[] | null>(null)
  const [conn, setConn] = useState<{ friends: Person[]; following: Person[]; followers: Person[]; suggestions: Person[] }>({ friends: [], following: [], followers: [], suggestions: [] })
  const [copied, setCopied] = useState(false)
  const [showLink, setShowLink] = useState(false)
  const canPickContacts = typeof navigator !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window

  const load = () => { if (userId && cloudEnabled) void fetchConnections(userId, data.joined).then(setConn).catch(() => {}) }
  useEffect(load, [userId, data.joined.length]) // eslint-disable-line react-hooks/exhaustive-deps
  // people who skipped the handle step still get a card, so friends can follow them
  useEffect(() => {
    if (!userId || !cloudEnabled || data.handle) return
    void ensureProfileCard(userId, data.name || 'Member', null, email).then((r) => { if (r) { setHandle(r.handle); update((d) => (d.handle ? d : { ...d, handle: r.handle, findByHandle: r.discoverable })) } }).catch(() => {})
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  const link = `${location.origin}${location.pathname}#/join?${[userId ? `u=${userId}` : '', data.handle ? `ref=${encodeURIComponent(data.handle)}` : '', data.primary ? `crew=${encodeURIComponent(data.primary)}` : ''].filter(Boolean).join('&')}`
  const share = async () => {
    const text = 'Train with me on Will Power. Your workout. Your crew.'
    try { if (navigator.share) { await navigator.share({ title: 'Will Power', text, url: link }); return } } catch { /* cancelled */ }
    try { await navigator.clipboard.writeText(link); setCopied(true) } catch { setShowLink(true); setMsg('Copy your invite link below.') }
  }

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true) }
    catch { setShowLink(true); setMsg('Copy your invite link below.') }
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
  const follow = async (p: { userId: string; name: string }) => { if (userId) { await followCloud(userId, p.userId); load(); setMsg(`You’re following ${p.name.split(' ')[0]}.`) } }
  const unfollow = async (p: Person) => { if (userId) { await unfollowCloud(userId, p.userId); load() } }
  const joinTheirCrew = (id: string) => {
    if (data.joined.includes(id)) return
    if (data.joined.length >= MAX_CREWS) { setMsg(`You’re in ${MAX_CREWS} crews already. Leave one on the Feed tab first.`); return }
    update((d) => ({ ...d, joined: [...d.joined, id], primary: d.primary ?? id }))
    if (userId) void joinCrewCloud(id, userId, data.name || 'Member', streak(data))
    setMsg('Joined!')
  }
  const crewName = (id: string) => all.find((c) => c.id === id)?.name ?? id

  const Row = ({ p, action }: { p: Person; action: 'follow' | 'followBack' | 'unfollow' }) => (
    <div className="person">
      <Avatar name={p.name} url={p.avatar} />
      <Link className="grow" to={`/friend/${p.userId}`}><b>{p.name.split(' ')[0]}</b> {p.handle && <span className="small mute">@{p.handle}</span>}{p.crews.some((c) => data.joined.includes(c)) && <span className="small mute"> · same crew</span>}</Link>
      {action === 'unfollow' ? <button className="ghost small-btn" onClick={() => void unfollow(p)}>Unfollow</button> : <button className="primary small-btn" onClick={() => void follow(p)}>{action === 'followBack' ? 'Follow back' : 'Follow'}</button>}
    </div>
  )

  return (
    <div className="friends-page">
      <SocialTabs />
      <div className="social-page-heading"><p className="overline">Your people</p><h1>Friends</h1><p>Train with people you know.</p></div>

      <section className="card friends-invite">
        <h2>Invite a friend</h2>
        <p className="small mute">Send your link. {data.primary ? 'They’ll see your crew as their first suggestion, and they’ll follow you when they join.' : 'They’ll follow you when they join the free beta.'}</p>
        <div className="friends-invite-actions"><button className="primary" onClick={() => void share()}>Share invite<Icon name="arrow" size={18} /></button><button className="ghost" onClick={() => void copyLink()}>Copy link</button></div>
        {showLink && <input className="social-invite-url" readOnly value={link} aria-label="Your invite link" onFocus={(event) => event.currentTarget.select()} />}
        {copied && <p className="social-feedback" role="status">Invite link copied.</p>}
      </section>

      {conn.followers.length > 0 && (
        <section className="card">
          <h2>Follow you</h2>
          <p className="small mute">They follow you. Follow back to become friends.</p>
          {conn.followers.map((p) => <Row key={p.userId} p={p} action="followBack" />)}
        </section>
      )}

      {conn.suggestions.length > 0 && (
        <section className="card">
          <h2>People in your crews</h2>
          <p className="small mute">Members of the crews you’re in.</p>
          {conn.suggestions.map((p) => <Row key={p.userId} p={p} action="follow" />)}
        </section>
      )}

      {conn.friends.length > 0 && (
        <section className="card">
          <h2>Friends</h2>
          {conn.friends.map((p) => <Row key={p.userId} p={p} action="unfollow" />)}
        </section>
      )}

      {conn.following.length > 0 && (
        <section className="card">
          <h2>Following</h2>
          <p className="small mute">They haven’t followed you back yet.</p>
          {conn.following.map((p) => <Row key={p.userId} p={p} action="unfollow" />)}
        </section>
      )}

      <section className="card">
        <h2>Find people</h2>
        {!cloudEnabled && <div className="banner">Sign in to a connected account to search for friends.</div>}
        <form className="social-input-action" onSubmit={(event) => { event.preventDefault(); void search() }}><label>Search by name or handle<input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or @handle" /></label><button className="primary" type="submit" disabled={!cloudEnabled || q.trim().length < 2}>Search</button></form>
        {canPickContacts
          ? <button className="ghost" onClick={() => void pick()} disabled={!cloudEnabled}>Find friends from contacts</button>
          : <p className="small mute">Contact matching isn’t available in this browser. Send an invite link instead.</p>}
        {results && results.length === 0 && <p className="small mute">No one found. They may not be on Will Power yet or have turned discovery off. Send them your invite link.</p>}
        {results?.filter((r) => r.userId !== userId).map((r) => (
          <div className="person" key={r.userId}><Avatar name={r.name} url={r.avatar} /><Link className="grow" to={`/friend/${r.userId}`}><b>{r.name.split(' ')[0]}</b> <span className="small mute">@{r.handle}</span></Link><button className="primary small-btn" onClick={() => void follow(r)}>Follow</button></div>
        ))}
      </section>

      <section className="card">
        <h2>Your handle</h2>
        <p className="small mute">{data.findByHandle ? 'Friends can find you by name or handle. Your handle starts as the first part of your email; change it below. Switch the search toggle off if you’d rather not be found.' : 'Friends can only follow you through your invite link. Turn on the toggle below to be found by name or handle.'}</p>
        <form className="social-input-action" onSubmit={(event) => { event.preventDefault(); void saveCard({ handle }) }}><label>Your handle<input value={handle} onChange={(e) => setHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))} placeholder="e.g. alex_lifts" maxLength={20} autoComplete="off" /></label><button className="primary" type="submit">Save</button></form>
        <button className="friends-discovery-toggle" role="switch" aria-checked={!!data.findByHandle} onClick={() => void saveCard({ findByHandle: !data.findByHandle })}><span>Let people find me by name or handle</span><span className={`tag ${data.findByHandle ? 'ok' : ''}`}>{data.findByHandle ? 'On' : 'Off'}</span></button>
        <button className="friends-discovery-toggle" role="switch" aria-checked={!!data.findByEmail} onClick={() => void saveCard({ findByEmail: !data.findByEmail })}><span>Let friends find me by email<br /><span className="small mute">Uses a hash of your email for matching.</span></span><span className={`tag ${data.findByEmail ? 'ok' : ''}`}>{data.findByEmail ? 'On' : 'Off'}</span></button>
        {msg && <p className="social-feedback" role="status">{msg}</p>}
      </section>
    </div>
  )
}
