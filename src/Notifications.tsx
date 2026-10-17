import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from './icons'
import { useApp } from './store'
import { cloudEnabled, useNotifications, type AppNotification } from './cloud'
import { ACTIVITY_BADGE_AT } from './cardio'
import { badgeStyle } from './badgeColor'
import type { ActivityNotice } from './types'

const ago = (ts: number) => {
  const m = Math.max(1, Math.round((Date.now() - ts) / 60000))
  if (m < 60) return `${m}m ago`
  if (m < 1440) return `${Math.round(m / 60)}h ago`
  if (m < 43200) return `${Math.round(m / 1440)}d ago`
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** The bell in the header, with a count of what you haven't seen yet. */
export function BellButton({ userId }: { userId: string | null }) {
  const { unread: fromPeople } = useNotifications(userId)
  const { data } = useApp()
  const unread = fromPeople + (data.notices ?? []).filter((n) => !n.read).length // likes, comments and follows, plus your own activity notes
  if (!cloudEnabled || !userId) return null
  return (
    <Link to="/notifications" className="icon-button bell-button" aria-label={unread ? `Notifications, ${unread} new` : 'Notifications'}>
      <Icon name="bell" />
      {unread > 0 && <span className="bell-badge" aria-hidden="true">{unread > 9 ? '9+' : unread}</span>}
    </Link>
  )
}

export function NotificationBell() {
  const { userId } = useApp()
  return <BellButton userId={userId} />
}

const line = (n: AppNotification) =>
  n.kind === 'comment' ? <><b>{n.actorName}</b> commented on your post</>
    : n.kind === 'like' ? <><b>{n.actorName}</b> liked your post</>
      : <><b>{n.actorName}</b> started following you</>

const activityPill = (name: string) => <span className="pv-activity" style={badgeStyle(name)}>{name}</span>
const noticeLine = (n: ActivityNotice) => n.kind === 'badge'
  ? <>You earned the {activityPill(n.activity)} badge. It’s on your profile now.</>
  : <>You logged your first {activityPill(n.activity)}. Do it {ACTIVITY_BADGE_AT - 1} more times and its badge goes on your profile.</>

/** The app's own notes to you about your activities (first session, badge earned), newest first. */
function ActivityNotices({ items, fresh }: { items: ActivityNotice[]; fresh: ReadonlySet<string> }) {
  return (
    <section className="card notif-list" aria-label="Your activities">
      {items.map((n) => (
        <Link key={n.id} to={n.kind === 'badge' ? '/profile' : '/cardio'} className={`notif ${fresh.has(n.id) ? 'new' : ''}`}>
          <span className="icon-surface"><Icon name={n.kind === 'badge' ? 'trophy' : 'flame'} size={18} /></span>
          <span className="notif-body">
            <span>{noticeLine(n)}</span>
            <span className="small mute">{ago(n.ts)}</span>
          </span>
          {fresh.has(n.id) && <span className="notif-dot" aria-label="New" />}
        </Link>
      ))}
    </section>
  )
}

export function NotificationList({ items, fresh, hideEmpty }: { items: AppNotification[]; fresh: ReadonlySet<string>; hideEmpty?: boolean }) {
  if (items.length === 0 && hideEmpty) return null
  if (items.length === 0) return <section className="card"><p className="mute">Nothing yet. When someone comments on your post, likes it, or follows you, it shows up here.</p></section>
  return (
    <section className="card notif-list">
      {items.map((n) => (
        <Link key={n.id} to={n.kind === 'follow' ? `/friend/${n.actorId}` : '/profile'} className={`notif ${fresh.has(n.id) ? 'new' : ''}`}>
          <span className="icon-surface"><Icon name={n.kind === 'comment' ? 'comment' : n.kind === 'like' ? 'heart' : 'person'} size={18} /></span>
          <span className="notif-body">
            <span>{line(n)}</span>
            {n.snippet && <span className="notif-snippet">“{n.snippet}”</span>}
            <span className="small mute">{ago(n.ts)}</span>
          </span>
          {fresh.has(n.id) && <span className="notif-dot" aria-label="New" />}
        </Link>
      ))}
    </section>
  )
}

export default function Notifications() {
  const { userId } = useApp()
  return <NotificationsPage userId={userId} />
}

export function NotificationsPage({ userId }: { userId: string | null }) {
  const { data, update } = useApp()
  const { items, loaded, markAllRead } = useNotifications(userId)
  const notices = data.notices ?? []
  // remember which ones were new when you opened the page, then mark them read
  const [fresh, setFresh] = useState<ReadonlySet<string>>(new Set())
  const [freshNotices, setFreshNotices] = useState<ReadonlySet<string>>(new Set())
  const marked = useRef(false)
  const noticesMarked = useRef(false)
  useEffect(() => {
    if (noticesMarked.current) return
    noticesMarked.current = true
    const ids = new Set(notices.filter((n) => !n.read).map((n) => n.id))
    setFreshNotices(ids)
    if (ids.size) setTimeout(() => update((d) => ({ ...d, notices: (d.notices ?? []).map((n) => (n.read ? n : { ...n, read: true })) })), 1200)
  }, [notices, update])
  useEffect(() => {
    if (!loaded || marked.current) return
    marked.current = true
    const ids = new Set(items.filter((n) => !n.read).map((n) => n.id))
    setFresh(ids)
    if (ids.size) setTimeout(() => { void markAllRead() }, 1200)
  }, [loaded, items, markAllRead])
  return (
    <>
      <div><h1>Notifications</h1></div>
      {notices.length > 0 && <ActivityNotices items={notices} fresh={freshNotices} />}
      {!cloudEnabled || !userId
        ? (notices.length === 0 && <section className="card"><p className="mute">Notifications need you to be signed in with an internet connection.</p></section>)
        : !loaded ? <p className="mute">Loading…</p> : <NotificationList items={items} fresh={fresh} hideEmpty={notices.length > 0} />}
    </>
  )
}
