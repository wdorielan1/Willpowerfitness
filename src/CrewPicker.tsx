import { useApp } from './store'
import { allCommunities } from './pages/Crew'

export interface MyCrew { id: string; name: string }

/** The crews you are in, your main one first. */
export function useMyCrews(): MyCrew[] {
  const { data } = useApp()
  return allCommunities(data.custom)
    .filter((c) => data.joined.includes(c.id))
    .sort((a, b) => (a.id === data.primary ? -1 : b.id === data.primary ? 1 : 0))
    .map((c) => ({ id: c.id, name: c.name }))
}

/**
 * "Post to" for anything that goes to a crew. Only shows when you are in two or more crews; with one there is nothing to choose.
 * You can pick one crew or several, but never none. A crew in `done` already has this post and cannot be picked again.
 */
export function PostTo({ crews, value, onChange, done = [], disabled, label = 'Post to' }: {
  crews: MyCrew[]; value: string[]; onChange: (ids: string[]) => void; done?: string[]; disabled?: boolean; label?: string
}) {
  if (crews.length < 2) return null
  const toggle = (id: string) => {
    if (value.includes(id)) { if (value.length > 1) onChange(value.filter((x) => x !== id)) } else onChange([...value, id])
  }
  return (
    <div className="post-to" role="group" aria-label={label}>
      <span className="post-to-label">{label}</span>
      <div className="chips">
        {crews.map((c) => {
          const posted = done.includes(c.id), on = !posted && value.includes(c.id)
          return <button key={c.id} type="button" className={`chip ${on ? 'on' : ''}${posted ? ' posted' : ''}`} aria-pressed={on} disabled={disabled || posted} onClick={() => toggle(c.id)}>{posted ? '✓ ' : on ? '✓ ' : ''}{c.name}</button>
        })}
      </div>
    </div>
  )
}
