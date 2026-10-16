import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { useApp } from './store'
import { Icon } from './icons'
import { moveRules, moveWorkout, workoutName, type WeekDay } from './engine'
import type { AppData, DayType } from './types'

const HOLD_MS = 350 // how long to press before a day lifts
const SLOP = 10 // moving further than this before it lifts means you are scrolling, not dragging

const short = (p: DayType) => (p === 'Rest/Cardio' ? 'Rest' : p === 'Shoulders/Abs' ? 'Sh/Abs' : p === 'Full Body' ? 'Full' : p)
const nameOf = (p: DayType) => (p === 'Rest/Cardio' ? 'a rest day' : workoutName(p))

// everything a move can change, so Undo can put it all back
const KEYS = ['dayOverride', 'exOrder', 'customSession', 'workoutFocus', 'extras', 'removed', 'swaps', 'drafts'] as const

/**
 * Moving a workout to another day of this week. `move` swaps the two days (see moveWorkout); `moved` is what just happened,
 * for a message with Undo; `rules` says which days can be picked up and which can take one.
 */
export function useWeekMove(week: WeekDay[], today: string) {
  const { data, update } = useApp()
  const rules = moveRules(data, today, week)
  const [moved, setMoved] = useState<{ text: string; undo: () => void } | null>(null)
  useEffect(() => {
    if (!moved) return
    const t = window.setTimeout(() => setMoved(null), 9000)
    return () => clearTimeout(t)
  }, [moved])
  const move = (from: string, to: string) => {
    const a = week.find((w) => w.date === from), b = week.find((w) => w.date === to)
    if (!a || !b || !rules.from.has(from) || !rules.to.has(to)) return
    const before = data
    update((d) => moveWorkout(d, from, to, today))
    const text = b.planned === 'Rest/Cardio'
      ? `Moved ${workoutName(a.planned)} to ${b.label}. ${a.label} is now a rest day.`
      : `Moved ${workoutName(a.planned)} to ${b.label}. ${a.label} is now ${nameOf(b.planned)}.`
    setMoved({ text, undo: () => { update((d) => ({ ...d, ...(Object.fromEntries(KEYS.map((k) => [k, before[k]])) as Partial<AppData>) })); setMoved(null) } })
  }
  return { rules, move, moved, dismiss: () => setMoved(null) }
}

/**
 * This week's days. Press and hold a day that has not happened yet, then drag it onto another day to swap them (a rest day can
 * take a workout too). A quick tap still opens the day.
 */
export function WeekStrip({ week, today, mover, onOpen }: { week: WeekDay[]; today: string; mover: ReturnType<typeof useWeekMove>; onOpen: (d: WeekDay) => void }) {
  const { rules, move, moved, dismiss } = mover
  const [drag, setDrag] = useState<{ from: string; dx: number; dy: number; over: string | null } | null>(null)
  const dragRef = useRef<typeof drag>(null)
  const stripRef = useRef<HTMLDivElement>(null)
  const press = useRef<{ id: number; x: number; y: number; timer: number } | null>(null)
  const rects = useRef<Record<string, DOMRect>>({})
  const swallow = useRef(false) // the tap that ends a drag should not also open the day
  const rulesRef = useRef(rules); rulesRef.current = rules

  const cancelPress = () => { if (press.current) { clearTimeout(press.current.timer); press.current = null } }
  const setBoth = (d: typeof drag) => { dragRef.current = d; setDrag(d) }
  useEffect(() => cancelPress, [])
  // once a day has lifted, the page must not scroll under the finger
  useEffect(() => {
    const el = stripRef.current
    if (!el) return
    const stop = (e: TouchEvent) => { if (dragRef.current) e.preventDefault() }
    el.addEventListener('touchmove', stop, { passive: false })
    return () => el.removeEventListener('touchmove', stop)
  }, [])

  const overOf = (x: number, y: number, from: string) => {
    for (const [date, r] of Object.entries(rects.current)) {
      if (date !== from && rulesRef.current.to.has(date) && x >= r.left && x <= r.right && y >= r.top - 60 && y <= r.bottom + 60) return date
    }
    return null
  }
  const down = (e: PointerEvent<HTMLButtonElement>, w: WeekDay) => {
    if (!rules.from.has(w.date) || (e.pointerType === 'mouse' && e.button !== 0)) return
    cancelPress()
    const target = e.currentTarget, id = e.pointerId
    press.current = {
      id, x: e.clientX, y: e.clientY,
      timer: window.setTimeout(() => {
        rects.current = Object.fromEntries([...(stripRef.current?.querySelectorAll<HTMLElement>('[data-date]') ?? [])].map((el) => [el.dataset.date!, el.getBoundingClientRect()]))
        try { target.setPointerCapture(id) } catch { /* the browser may have already taken the pointer */ }
        try { navigator.vibrate?.(12) } catch { /* not everywhere */ }
        setBoth({ from: w.date, dx: 0, dy: 0, over: null })
      }, HOLD_MS),
    }
  }
  const moveTo = (e: PointerEvent<HTMLButtonElement>) => {
    const p = press.current
    if (!p || e.pointerId !== p.id) return
    const d = dragRef.current
    if (d) {
      e.preventDefault()
      setBoth({ ...d, dx: e.clientX - p.x, dy: e.clientY - p.y, over: overOf(e.clientX, e.clientY, d.from) })
    } else if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > SLOP) cancelPress()
  }
  const up = (e: PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current
    if (press.current && e.pointerId !== press.current.id) return
    cancelPress()
    if (!d) return
    setBoth(null)
    swallow.current = true
    window.setTimeout(() => { swallow.current = false }, 400)
    if (d.over) move(d.from, d.over)
  }
  const cancel = () => { cancelPress(); if (dragRef.current) setBoth(null) }

  return (
    <>
      <div ref={stripRef} className={`week-strip${drag ? ' is-dragging' : ''}`}>
        {week.map((d) => {
          const lifted = drag?.from === d.date
          const target = !!drag && !lifted && rules.to.has(d.date)
          const can = rules.from.has(d.date)
          return <button type="button" data-date={d.date} key={d.date}
            className={`week-day status-${d.status}${d.date === today ? ' is-today' : ''}${can ? ' can-move' : ''}${lifted ? ' is-lifted' : ''}${target ? ' is-target' : ''}${drag?.over === d.date ? ' is-over' : ''}`}
            style={lifted ? { transform: `translate(${drag.dx}px, ${drag.dy}px) scale(1.1)` } : undefined}
            onClick={() => { if (swallow.current) { swallow.current = false; return } onOpen(d) }}
            onPointerDown={(e) => down(e, d)} onPointerMove={moveTo} onPointerUp={up} onPointerCancel={cancel}
            onContextMenu={(e) => { if (can) e.preventDefault() }}
            title={`${d.label}: ${d.planned} · ${d.status}`}
            aria-label={`${d.label}, ${d.planned}, ${d.status}${d.date === today ? ', today' : ''}. Tap to see the workout${can ? ' or move it' : ''}.`}>
            <span aria-hidden="true">{d.label[0]}</span>
            <span className="week-day-dot" aria-hidden="true">{d.status === 'done' && <Icon name="check" />}</span>
            <span className="week-day-plan" aria-hidden="true">{short(d.planned)}</span>
          </button>
        })}
      </div>
      {moved
        ? <p className="week-moved" role="status"><span>{moved.text}</span><button type="button" className="quiet-action" onClick={moved.undo}>Undo</button><button type="button" className="quiet-action" aria-label="Dismiss" onClick={dismiss}><Icon name="close" size={14} /></button></p>
        : rules.from.size > 0 && <p className="week-hint">Hold a workout and drag it to another day to move it.</p>}
    </>
  )
}
