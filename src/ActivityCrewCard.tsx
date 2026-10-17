import { crewNameFor } from './cardio'

/** On the person's own Crew page: a sport they have done 5 times, with an offer to start a crew for it. Only they see it. */
export function ActivityCrewCard({ activity, count, onStart, onDismiss }: { activity: string; count: number; onStart: () => void; onDismiss: () => void }) {
  const crew = crewNameFor(activity)
  return (
    <section className="rec start" role="group" aria-label={`Start a ${activity} crew`}>
      <b>You’ve done {activity} {count} times.</b>
      <span className="small">Want a crew for it? Start “{crew}”. You choose the time and place before it is created.</span>
      <div className="row wrap">
        <button type="button" className="primary small-btn" onClick={onStart}>Start “{crew}”</button>
        <button type="button" className="ghost small-btn" onClick={onDismiss}>Not now</button>
      </div>
    </section>
  )
}
