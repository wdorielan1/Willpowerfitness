import { fmtDuration } from './shareCard'
import { fmtVolume, type WorkoutView } from './workoutPost'

/** The body of a shared workout in the crew feed: the session, any PR, the numbers, the top lifts and a streak. */
export function WorkoutCard({ w, crewDone }: { w: WorkoutView; crewDone?: { done: number; members: number } }) {
  const pr = w.prs[0]
  return (
    <div className="wk-body">
      <div className="wk-title"><h3>{w.title}</h3>{w.minutes ? <span>{fmtDuration(w.minutes)}</span> : null}</div>
      {pr && (
        <div className="wk-pr">
          <span className="wk-badge">NEW PR</span>
          <div><b>{pr.name}</b>{pr.weight ? <span> {pr.weight} lb × {pr.reps}</span> : null}{w.prs.length > 1 && <span className="wk-more"> +{w.prs.length - 1} more</span>}</div>
        </div>
      )}
      <div className="wk-strip" role="group" aria-label={`${w.exercises} exercises, ${w.sets} sets${w.volume !== undefined ? `, ${fmtVolume(w.volume)} pounds lifted` : ''}`}>
        <div><b>{w.exercises}</b><em>Exercises</em></div>
        <div><b>{w.sets}</b><em>Sets</em></div>
        {w.volume !== undefined && <div><b>{fmtVolume(w.volume)}</b><em>Lb lifted</em></div>}
      </div>
      {w.lifts.length > 0 && (
        <ul className="wk-lifts" aria-label="Top lifts">
          {w.lifts.map((l) => <li key={l.n}><b>{l.n}</b><span>{l.w} × {l.r}</span></li>)}
          {w.more > 0 && <li className="wk-more-lifts">+ {w.more} more {w.more === 1 ? 'lift' : 'lifts'}</li>}
        </ul>
      )}
      {(w.streak || crewDone) && (
        <div className="wk-foot">
          {w.streak && <span className="wk-pill"><i aria-hidden="true">●</i> {w.streak}-day streak</span>}
          {crewDone && crewDone.members > 1 && crewDone.done > 0 && <span className="wk-pill">{crewDone.done} of {crewDone.members} crew done today</span>}
        </div>
      )}
    </div>
  )
}
