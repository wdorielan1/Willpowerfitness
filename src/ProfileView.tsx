import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from './components'
import { addDays, fromISO, todayISO } from './engine'
import { BADGES, type ProfileStats } from './profileStats'
import type { PublicPost } from './cloud'

const ago = (ts: number) => {
  const m = Math.max(1, Math.round((Date.now() - ts) / 60000))
  if (m < 60) return `${m}m ago`
  if (m < 1440) return `${Math.round(m / 60)}h ago`
  if (m < 43200) return `${Math.round(m / 1440)}d ago`
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

/** 12 weeks of workouts as a grid: a filled square for every day with a finished workout. */
function Calendar({ days }: { days: string[] }) {
  const today = todayISO()
  const done = new Set(days)
  const mondayOffset = (fromISO(today).getDay() + 6) % 7
  const start = addDays(today, -mondayOffset - 77)
  const cells = Array.from({ length: 84 }, (_, i) => addDays(start, i))
  return (
    <div className="pv-cal" role="img" aria-label={`${days.length} workouts in the last 12 weeks`}>
      {cells.map((d) => <span key={d} className={`pv-day ${d > today ? 'is-future' : done.has(d) ? 'is-done' : ''}`} title={d} />)}
    </div>
  )
}

export interface ProfileViewProps {
  name: string
  handle?: string | null
  avatar?: string | null
  bio?: string | null
  stats?: ProfileStats | null
  posts?: PublicPost[] | null
  crewName: (id: string) => string
  /** show locked badges too (your own profile) */
  showLocked?: boolean
  actions?: ReactNode
  /** what to say when there are no posts */
  emptyPosts?: string
  followers?: number | null
  following?: number | null
  /** link the counts to the Followers / Following lists (your own profile) */
  countsLink?: boolean
  /** link crew chips (in-app only) */
  onCrew?: (id: string) => void
  crewJoined?: (id: string) => boolean
}

export default function ProfileView(p: ProfileViewProps) {
  const st = p.stats ?? {}
  const earned = new Set(st.badges ?? [])
  const badges = BADGES.filter((b) => p.showLocked || earned.has(b.id))
  const crews = st.crews ?? []
  return (
    <div className="pv">
      <section className="card pv-head">
        <Avatar name={p.name} url={p.avatar} size={84} />
        <h1 className="pv-name">{p.name}</h1>
        {p.handle && <p className="mute small">@{p.handle}</p>}
        {p.bio && <p className="pv-bio">{p.bio}</p>}
        {(p.followers != null || p.following != null) && (
          <p className="pv-counts">
            {p.countsLink
              ? <><Link to="/friends?tab=followers"><b>{p.followers ?? 0}</b> followers</Link><Link to="/friends?tab=following"><b>{p.following ?? 0}</b> following</Link></>
              : <><span><b>{p.followers ?? 0}</b> followers</span><span><b>{p.following ?? 0}</b> following</span></>}
          </p>
        )}
        {st.since && <p className="small mute">Training since {new Date(st.since + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</p>}
        {p.actions && <div className="pv-actions">{p.actions}</div>}
      </section>

      <section className="pv-stats card">
        <div><b>{st.streak ?? 0}</b><span>day streak</span></div>
        <div><b>{st.workouts30 ?? 0}</b><span>workouts, 30 days</span></div>
        <div><b>{st.workoutsTotal ?? 0}</b><span>workouts total</span></div>
      </section>

      <section className="card">
        <h2>Consistency</h2>
        <p className="small mute">Last 12 weeks. Every square is a day they showed up.</p>
        <Calendar days={st.days ?? []} />
      </section>

      {badges.length > 0 && (
        <section className="card">
          <h2>Badges</h2>
          <div className="pv-badges">
            {badges.map((b) => <div key={b.id} className={`pv-badge ${earned.has(b.id) ? '' : 'is-locked'}`} title={b.hint}><span>{b.emoji}</span><b>{b.label}</b></div>)}
          </div>
        </section>
      )}

      <section className="card">
        <h2>Crews</h2>
        <div className="chips">
          {crews.length === 0 ? <span className="small mute">Not in a crew yet</span> : crews.map((c) => p.onCrew
            ? <button key={c} className={`chip ${p.crewJoined?.(c) ? 'on' : ''}`} onClick={() => p.onCrew!(c)}>{p.crewJoined?.(c) ? '✓ ' : '＋ '}{p.crewName(c)}</button>
            : <span key={c} className="chip">{p.crewName(c)}</span>)}
        </div>
      </section>

      <section className="card">
        <h2>Posts</h2>
        {!p.posts ? <p className="small mute">Loading…</p> : p.posts.length === 0 ? <p className="small mute">{p.emptyPosts ?? 'No posts yet.'}</p> : p.posts.map((x) => (
          <article key={x.id} className="pv-post">
            <div className="row"><span className="small mute">{p.crewName(x.crewId)} · {ago(x.ts)}</span>{x.kind === 'workout' ? <span className="tag ok">Workout</span> : x.kind === 'qotd' ? <span className="tag accent">Question of the day</span> : null}</div>
            {x.text && <p>{x.text}</p>}
            {x.hasPhoto && <p className="small mute">📷 Shared a photo with the crew</p>}
          </article>
        ))}
      </section>
    </div>
  )
}
