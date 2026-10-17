import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../store'
import { Avatar, Sheet } from '../components'
import { Icon, type IconName } from '../icons'
import { CHALLENGES } from '../challenges'
import { FOODS } from '../foods'
import { addableExercises, fromISO, workoutName } from '../engine'
import { imgUrl, mediaFor, useMediaVersion } from '../exerciseMedia'
import { cloudEnabled, fetchConnections, findByHandle } from '../cloud'
import { allCommunities } from './Crew'
import type { Exercise } from '../types'

interface Hit { id: string; title: string; sub?: string; to?: string; open?: () => void; avatar?: { name: string; url?: string | null }; icon?: IconName }
interface Group { key: string; label: string; hits: Hit[] }

const PAGES: { title: string; to: string; icon: IconName; words: string }[] = [
  { title: 'Today and the feed', to: '/', icon: 'home', words: 'home dashboard this week streak check in feed posts share photo video comment crews following' },
  { title: 'Train: start a workout', to: '/workout', icon: 'weight', words: 'workout lift gym session build your own custom exercises warm up' },
  { title: 'Crew', to: '/crew', icon: 'crew', words: 'crews community check in leaderboard qotd question of the day find crews' },
  { title: 'Find friends', to: '/friends', icon: 'person', words: 'friends follow followers following invite contacts people add' },
  { title: 'Free Challenges', to: '/challenges', icon: 'chart', words: 'challenge compete leaderboard prize steps gym rat free fantasy fitness points' },
  { title: 'Progress', to: '/progress', icon: 'chart', words: 'charts graphs history strength consistency stats records pr one rep max' },
  { title: 'Log body weight', to: '/log?t=weight', icon: 'plus', words: 'weigh in scale bodyweight weight log' },
  { title: 'Log cardio', to: '/log?t=cardio', icon: 'plus', words: 'run walk bike swim cardio minutes log' },
  { title: 'Log steps', to: '/log?t=steps', icon: 'plus', words: 'steps walking log' },
  { title: 'Progress photos', to: '/photos', icon: 'photo', words: 'photos pictures before after side by side compare' },
  { title: 'Import history', to: '/import', icon: 'upload', words: 'import chatgpt csv upload lifting history starting weights body weight' },
  { title: 'Export my data', to: '/export', icon: 'download', words: 'export download csv spreadsheet ai coach backup' },
  { title: 'Nutrition', to: '/nutrition', icon: 'weight', words: 'food fuel macros calories protein carbs fat meals diet eating' },
  { title: 'My foods', to: '/nutrition?tab=foods', icon: 'weight', words: 'saved foods meals import chatgpt table repeat same food' },
  { title: 'Notifications', to: '/notifications', icon: 'bell', words: 'alerts bell likes comments followers' },
  { title: 'My profile', to: '/profile', icon: 'person', words: 'profile bio photo avatar posts followers public share' },
  { title: 'Settings', to: '/settings', icon: 'person', words: 'settings account sex rest timer sound units targets password email name delete public discoverable' },
  { title: 'Shortcuts', to: '/shortcuts', icon: 'plus', words: 'shortcuts iphone siri home screen install' },
  { title: 'Privacy policy', to: '/privacy', icon: 'person', words: 'privacy data policy' },
  { title: 'Terms of use', to: '/terms', icon: 'person', words: 'terms conditions legal' },
]
const SUGGESTED = ['Find friends', 'Log body weight', 'My foods', 'Progress', 'Import history', 'Settings']

const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9@_ ]+/g, ' ').replace(/\s+/g, ' ').trim()
/** Every word you type must appear; matches at the start of a name rank first. */
function rank(q: string, ...fields: (string | undefined)[]): number | null {
  const terms = clean(q).split(' ').filter(Boolean)
  if (!terms.length) return null
  const hay = fields.filter(Boolean).map((f) => clean(f!)).join(' | ')
  if (!terms.every((t) => hay.includes(t))) return null
  const first = clean(fields[0] ?? ''), phrase = terms.join(' ')
  // the whole phrase at the start of the name is best, then anywhere in it, then the first word
  return first === phrase ? -1 : first.startsWith(phrase) ? 0 : first.includes(phrase) ? 1 : first.startsWith(terms[0]) ? 2 : first.includes(` ${terms[0]}`) ? 3 : 4
}
const pick = <T,>(items: T[], q: string, fields: (item: T) => (string | undefined)[], boost?: (item: T) => number): T[] =>
  items.map((it) => ({ it, r: rank(q, ...fields(it)) })).filter((x): x is { it: T; r: number } => x.r !== null)
    .sort((a, b) => (a.r - (boost?.(a.it) ?? 0)) - (b.r - (boost?.(b.it) ?? 0)) || (fields(a.it)[0] ?? '').length - (fields(b.it)[0] ?? '').length).map((x) => x.it)

function ExerciseSheet({ ex, onClose }: { ex: Exercise; onClose: () => void }) {
  const m = mediaFor(ex.id)
  return (
    <Sheet title={ex.name} onClose={onClose}>
      {m && <img src={imgUrl(m.slug, 0)} alt={`How to do ${ex.name}`} style={{ width: '100%', borderRadius: 12, maxHeight: 260, objectFit: 'cover' }} />}
      <p className="small mute">{ex.muscle}{ex.equip ? ` · ${ex.equip}` : ''} · {ex.sets} sets × {ex.reps[0]}–{ex.reps[1]} reps</p>
      {ex.note && <p>{ex.note}</p>}
      {m && m.steps.length > 0 && <ol className="steps">{m.steps.map((s, i) => <li className="step" key={i}>{s}</li>)}</ol>}
      <Link to="/workout" className="primary" style={{ textDecoration: 'none', textAlign: 'center' }} onClick={onClose}>Go to Train</Link>
    </Sheet>
  )
}

export default function Search() {
  useMediaVersion()
  const { data, userId } = useApp()
  const nav = useNavigate()
  const [sp, setSp] = useSearchParams()
  const [q, setQ] = useState(sp.get('q') ?? '')
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [exercise, setExercise] = useState<Exercise | null>(null)
  const [known, setKnown] = useState<{ userId: string; name: string; handle: string | null; avatar: string | null; relation: string }[]>([])
  const [found, setFound] = useState<{ userId: string; name: string; handle: string; avatar?: string | null }[]>([])
  const query = q.trim()

  // people you already follow or who follow you (loaded once)
  useEffect(() => {
    if (!cloudEnabled || !userId) return
    let alive = true
    void fetchConnections(userId, data.joined).then((c) => {
      if (!alive) return
      const seen = new Map<string, { userId: string; name: string; handle: string | null; avatar: string | null; relation: string }>()
      for (const [list, relation] of [[c.friends, 'Friend'], [c.following, 'Following'], [c.followers, 'Follows you'], [c.suggestions, 'In your crew']] as const) for (const p of list) if (!seen.has(p.userId)) seen.set(p.userId, { userId: p.userId, name: p.name, handle: p.handle, avatar: p.avatar, relation })
      setKnown([...seen.values()])
    }).catch(() => {})
    return () => { alive = false }
  }, [userId, data.joined])

  // anyone who has turned on discovery, by name or @handle (a short pause after typing)
  useEffect(() => {
    if (!cloudEnabled || !userId || query.replace('@', '').length < 2) { setFound([]); return }
    let alive = true
    const t = setTimeout(() => { void findByHandle(query.replace(/^@/, '')).then((r) => { if (alive) setFound(r.filter((p) => p.userId !== userId)) }).catch(() => {}) }, 280)
    return () => { alive = false; clearTimeout(t) }
  }, [query, userId])

  const library = useMemo(() => (data.profile ? addableExercises([], data.profile) : []), [data.profile])
  const crews = useMemo(() => allCommunities(data.custom), [data.custom])

  const groups: Group[] = useMemo(() => {
    if (!query) return []
    const out: Group[] = []
    const knownHits = pick(known, query, (p) => [p.name, p.handle ? `@${p.handle} ${p.handle}` : undefined])
    const ids = new Set(knownHits.map((p) => p.userId))
    const people: Hit[] = [
      ...knownHits.map((p) => ({ id: `k${p.userId}`, title: p.name, sub: `${p.handle ? `@${p.handle} · ` : ''}${p.relation}`, to: `/friend/${p.userId}`, avatar: { name: p.name, url: p.avatar } })),
      ...found.filter((p) => !ids.has(p.userId)).map((p) => ({ id: `f${p.userId}`, title: p.name, sub: `@${p.handle}`, to: `/friend/${p.userId}`, avatar: { name: p.name, url: p.avatar } })),
    ]
    if (people.length) out.push({ key: 'people', label: 'People', hits: people })
    const pages = pick(PAGES, query, (p) => [p.title, p.words]).map((p) => ({ id: `p${p.to}${p.title}`, title: p.title, to: p.to, icon: p.icon }))
    if (pages.length) out.push({ key: 'pages', label: 'Pages and actions', hits: pages })
    const cr = pick(crews, query, (c) => [c.name, c.vibe, c.place, c.cat]).map((c) => ({ id: `c${c.id}`, title: c.name, sub: `${data.joined.includes(c.id) ? 'Your crew · ' : ''}${c.place ?? c.vibe}`, to: '/crew', icon: 'crew' as IconName }))
    const ch = pick([...CHALLENGES.map((c) => ({ id: c.id, name: c.name, blurb: c.blurb })), ...data.customChallenges.map((c) => ({ id: c.id, name: c.name, blurb: `Custom challenge` }))], query, (c) => [c.name, c.blurb]).map((c) => ({ id: `ch${c.id}`, title: c.name, sub: c.blurb, to: '/challenges', icon: 'chart' as IconName }))
    if (cr.length) out.push({ key: 'crews', label: 'Crews', hits: cr })
    if (ch.length) out.push({ key: 'challenges', label: 'Challenges', hits: ch })
    const ex = pick(library, query, (e) => [e.name, e.muscle, e.equip], (e) => (e.lib ? 0 : 1.5)).map((e) => ({ id: `e${e.id}`, title: e.name, sub: `${e.muscle}${e.equip ? ` · ${e.equip}` : ''}`, open: () => setExercise(e), icon: 'weight' as IconName }))
    if (ex.length) out.push({ key: 'exercises', label: 'Exercises', hits: ex })
    const foods = pick([...data.customFoods, ...FOODS], query, (f) => [f.name, f.cat]).map((f) => ({ id: `fd${f.id}`, title: f.name, sub: `${f.serving} · ${Math.round(f.cal)} kcal · ${Math.round(f.p)}P ${Math.round(f.c)}C ${Math.round(f.f)}F${f.cat === 'My foods' ? ' · My foods' : ''}`, to: f.cat === 'My foods' ? '/nutrition?tab=foods' : '/nutrition', icon: 'weight' as IconName }))
    if (foods.length) out.push({ key: 'foods', label: 'Foods', hits: foods })
    const logs = pick([...data.logs].filter((l) => !l.baseline && !l.skipped && l.entries.length).sort((a, b) => b.date.localeCompare(a.date)), query, (l) => [
      workoutName(l.dayType), fromISO(l.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }), l.entries.map((e) => e.name).join(' '),
    ]).map((l) => ({ id: `w${l.date}`, title: `${workoutName(l.dayType)} · ${fromISO(l.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`, sub: `${l.entries.length} exercises · ${l.entries.reduce((a, e) => a + e.sets.length, 0)} sets`, to: '/progress', icon: 'check' as IconName }))
    if (logs.length) out.push({ key: 'workouts', label: 'Your workouts', hits: logs })
    return out
  }, [query, known, found, crews, library, data.customFoods, data.customChallenges, data.logs, data.joined])

  const total = groups.reduce((a, g) => a + g.hits.length, 0)
  const setQuery = (v: string) => { setQ(v); setSp(v.trim() ? { q: v.trim() } : {}, { replace: true }) }

  return (
    <div className="search-page">
      <form className="search-bar" role="search" onSubmit={(e) => e.preventDefault()}>
        <button type="button" className="icon-button" aria-label="Back" onClick={() => nav(-1)}><Icon name="back" /></button>
        <div className="search-field">
          <Icon name="search" size={18} />
          <input type="search" autoFocus value={q} onChange={(e) => setQuery(e.target.value)} placeholder="Search friends, foods, exercises, pages…" aria-label="Search Will Power" enterKeyHint="search" />
          {q && <button type="button" className="search-clear" aria-label="Clear search" onClick={() => setQuery('')}><Icon name="close" size={16} /></button>}
        </div>
      </form>

      {!query && (
        <section className="card search-suggest">
          <p className="mute">Find a friend by name or @handle, or search anything in the app: exercises, foods, crews, challenges, your past workouts, and settings.</p>
          <div className="chips" aria-label="Try searching for">{SUGGESTED.map((s) => <button key={s} type="button" className="chip" onClick={() => setQuery(s)}>{s}</button>)}</div>
        </section>
      )}

      {query && total === 0 && (
        <section className="card"><h3>Nothing found for “{query}”</h3><p className="small mute">Try a friend’s name or @handle, an exercise, a food or a page.{!cloudEnabled && ' Sign in to a connected account to search for people.'}</p></section>
      )}

      {groups.map((g) => {
        const showAll = open[g.key]
        const hits = showAll ? g.hits.slice(0, 40) : g.hits.slice(0, 5)
        return (
          <section className="search-group" key={g.key} aria-label={g.label}>
            <div className="search-group-head"><h2>{g.label}</h2><span className="small mute">{g.hits.length}</span></div>
            <div className="card search-results">
              {hits.map((h) => {
                const inner = <>
                  {h.avatar ? <Avatar name={h.avatar.name} url={h.avatar.url} /> : <span className="icon-surface"><Icon name={h.icon ?? 'chevron'} size={18} /></span>}
                  <span className="search-hit-text"><b>{h.title}</b>{h.sub && <span className="small mute">{h.sub}</span>}</span>
                  <Icon name="chevron" size={16} />
                </>
                return h.to
                  ? <Link key={h.id} to={h.to} className="search-hit">{inner}</Link>
                  : <button key={h.id} type="button" className="search-hit" onClick={h.open}>{inner}</button>
              })}
              {g.hits.length > 5 && <button type="button" className="search-more" onClick={() => setOpen({ ...open, [g.key]: !showAll })}>{showAll ? 'Show fewer' : `Show all ${g.hits.length}`}</button>}
            </div>
          </section>
        )
      })}
      {exercise && <ExerciseSheet ex={exercise} onClose={() => setExercise(null)} />}
    </div>
  )
}
