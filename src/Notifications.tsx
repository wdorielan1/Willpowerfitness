import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from './icons'
import { useApp } from './store'
import { cloudEnabled, useNotifications, type AppNotification } from './cloud'

const ago = (ts: number) => {
  const m = Math.max(1, Math.round((Date.now() - ts) / 60000))
  if (m < 60) return `${m}m ago`
  if (m < 1440) return `${Math.round(m / 60)}h ago`
  if (m < 43200) return `${Math.round(m / 1440)}d ago`
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** The bell in the header, with a count of what you haven't seen yet. */
export function BellButton({ userId }: { userId: string | null }) {
  const { unread } = useNotifications(userId)
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

export function NotificationList({ items, fresh }: { items: AppNotification[]; fresh: ReadonlySet<string> }) {
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
  const { items, loaded, markAllRead } = useNotifications(userId)
  // remember which ones were new when you opened the page, then mark them read
  const [fresh, setFresh] = useState<ReadonlySet<string>>(new Set())
  const marked = useRef(false)
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
      {!cloudEnabled || !userId
        ? <section className="card"><p className="mute">Notifications need you to be signed in with an internet connection.</p></section>
        : !loaded ? <p className="mute">Loading…</p> : <NotificationList items={items} fresh={fresh} />}
    </>
  )
}
