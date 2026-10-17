import { Sheet } from './components'
import { useApp } from './store'
import { editableDays, fromISO, resetWeek, setDayType, workoutName, type WeekDay } from './engine'
import type { DayType } from './types'

const CHOICES: [DayType, string][] = [['Push', 'Push'], ['Pull', 'Pull'], ['Legs', 'Legs'], ['Shoulders/Abs', 'Shoulders + Abs'], ['Full Body', 'Full Body'], ['Rest/Cardio', 'Rest']]
const STATUS: Partial<Record<WeekDay['status'], string>> = { done: 'Done', missed: 'Missed', skipped: 'Skipped' }

/**
 * The whole week on one screen: tap a workout (or Rest) for any day that has not happened yet and that is what the day becomes.
 * Days already done or missed are shown but cannot change. Other days stay as they are.
 */
export function EditWeek({ week, today, onClose }: { week: WeekDay[]; today: string; onClose: () => void }) {
  const { data, update } = useApp()
  const open = editableDays(data, today, week)
  const changed = Object.keys(data.dayOverride).some((date) => open.has(date))
  return (
    <Sheet title="Edit this week" onClose={onClose}>
      <p className="small mute">Tap a workout for any day to set it. Days that are done stay as they were, and the other days don’t change.</p>
      <div className="edit-week">
        {week.map((w) => {
          const can = open.has(w.date)
          const name = fromISO(w.date).toLocaleDateString(undefined, { weekday: 'long' })
          return (
            <div key={w.date} className={`edit-week-day${can ? '' : ' locked'}${w.date === today ? ' is-today' : ''}`}>
              <div className="edit-week-head">
                <b>{name}{w.date === today ? ' · today' : ''}</b>
                <span className="small mute">{can ? (w.planned === 'Rest/Cardio' ? 'Rest' : workoutName(w.planned)) : `${w.planned === 'Rest/Cardio' ? 'Rest' : workoutName(w.planned)}${STATUS[w.status] ? ` · ${STATUS[w.status]}` : ''}`}</span>
              </div>
              {can && <div className="chips" role="group" aria-label={`${name}'s workout`}>
                {CHOICES.map(([type, label]) => <button type="button" key={type} className={`chip ${w.planned === type ? 'on' : ''}`} aria-pressed={w.planned === type} onClick={() => update((d) => setDayType(d, w.date, type, today))}>{label}</button>)}
              </div>}
            </div>
          )
        })}
      </div>
      <div className="row wrap">
        <button type="button" className="ghost" disabled={!changed} onClick={() => update((d) => resetWeek(d, today))}>Put the week back to the plan</button>
        <span style={{ flex: 1 }} />
        <button type="button" className="primary" onClick={onClose}>Done</button>
      </div>
    </Sheet>
  )
}
