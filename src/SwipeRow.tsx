import { useRef, useState, type ReactNode } from 'react'
import { Icon } from './icons'

const LOCK = 10 // px of sideways movement before the row starts following the finger
const GO = 76 // px past which letting go counts as a swipe

/**
 * A row you can swipe: right runs `onRight`, left runs `onLeft`. Up and down still scroll the page, taps still
 * reach the inputs and buttons inside. Pass undefined for a direction to turn it off (the row resists).
 */
export function SwipeRow({ children, onRight, onLeft, rightLabel, leftLabel }: {
  children: ReactNode; onRight?: () => void; onLeft?: () => void; rightLabel: string; leftLabel: string
}) {
  const [dx, setDx] = useState(0)
  const [held, setHeld] = useState(false)
  const start = useRef<{ x: number; y: number; id: number } | null>(null)
  const locked = useRef(false)
  const dist = useRef(0) // the live distance, read on release so a fast flick is never lost to a pending render
  const suppress = useRef(0)

  const end = (e: React.PointerEvent<HTMLDivElement>, commit: boolean) => {
    const s = start.current
    if (!s || s.id !== e.pointerId) return
    start.current = null
    if (!locked.current) return
    locked.current = false; suppress.current = Date.now() + 350
    setHeld(false)
    const d = dist.current
    const go = commit && d >= GO && onRight ? onRight : commit && d <= -GO && onLeft ? onLeft : null
    dist.current = 0; setDx(0)
    if (go) { navigator.vibrate?.(10); go() }
  }
  const down = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && (e.button !== 0 || (e.target as HTMLElement).closest('input, button'))) return
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId }; locked.current = false; dist.current = 0
  }
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = start.current
    if (!s || s.id !== e.pointerId) return
    const mx = e.clientX - s.x, my = e.clientY - s.y
    if (!locked.current) {
      if (Math.abs(my) > LOCK && Math.abs(my) > Math.abs(mx)) { start.current = null; return } // that is a scroll
      if (Math.abs(mx) < LOCK || Math.abs(mx) < Math.abs(my) * 1.4) return
      locked.current = true; setHeld(true)
      try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* the pointer already ended */ }
    }
    const v = mx - Math.sign(mx) * LOCK
    const ok = v > 0 ? !!onRight : !!onLeft
    dist.current = Math.max(-150, Math.min(150, ok ? v : v * 0.2)); setDx(dist.current)
  }

  const armed = (dx >= GO && !!onRight) || (dx <= -GO && !!onLeft)
  return (
    <div className="swipe-row" data-noswipe onPointerDown={down} onPointerMove={move} onPointerUp={(e) => end(e, true)} onPointerCancel={(e) => end(e, false)}
      onClickCapture={(e) => { if (Date.now() < suppress.current) { e.preventDefault(); e.stopPropagation() } }}>
      {dx > 0 && <div className={`swipe-bg right${armed ? ' armed' : ''}`} aria-hidden="true"><Icon name="check" size={20} />{rightLabel}</div>}
      {dx < 0 && <div className={`swipe-bg left${armed ? ' armed' : ''}`} aria-hidden="true">{leftLabel}<Icon name="trash" size={20} /></div>}
      <div className={`swipe-front${held ? ' held' : ''}`} style={dx ? { transform: `translateX(${dx}px)` } : undefined}>{children}</div>
    </div>
  )
}
