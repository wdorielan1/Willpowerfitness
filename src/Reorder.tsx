import { useEffect, useRef, useState, type ReactNode } from 'react'

const HOLD_MS = 350      // how long to press before the row lifts
const SLOP = 9           // moving more than this before it lifts means you are scrolling, not dragging
const EDGE = 90          // distance from the screen edge where the page scrolls for you

const move = <T,>(list: T[], from: number, to: number): T[] => {
  const next = list.slice()
  const [it] = next.splice(from, 1)
  next.splice(to, 0, it)
  return next
}

/**
 * A list you reorder by pressing and holding a row, then dragging it up or down, like lifting a sticker.
 * A quick tap or a normal scroll still works as before. Keyboard: focus a row and press Alt + Arrow Up or Down.
 */
export function ReorderList<T>({ items, getKey, onReorder, children, className, label }: {
  items: T[]
  getKey: (item: T) => string
  onReorder: (next: T[]) => void
  children: (item: T, index: number) => ReactNode
  className?: string
  label: string
}) {
  const [drag, setDrag] = useState<{ from: number; to: number; dy: number } | null>(null)
  const rows = useRef<(HTMLDivElement | null)[]>([])
  const press = useRef<{ timer: number; x: number; y: number; id: number; index: number } | null>(null)
  const geo = useRef<{ tops: number[]; heights: number[]; startPageY: number } | null>(null)
  const active = useRef(false)
  const lastY = useRef(0)
  const raf = useRef(0)
  const dragRef = useRef(drag); dragRef.current = drag
  const itemsRef = useRef(items); itemsRef.current = items
  const suppress = useRef(0)
  const [note, setNote] = useState('')

  // once a row is lifted, the page must not scroll under the finger
  useEffect(() => {
    const block = (e: TouchEvent) => { if (active.current) e.preventDefault() }
    document.addEventListener('touchmove', block, { passive: false })
    return () => { document.removeEventListener('touchmove', block); cancelAnimationFrame(raf.current); window.clearTimeout(press.current?.timer) }
  }, [])

  const targetFor = (from: number, dy: number) => {
    const g = geo.current!
    const center = g.tops[from] + dy + g.heights[from] / 2
    let to = 0
    g.tops.forEach((top, j) => { if (j !== from && top + g.heights[j] / 2 < center) to++ })
    return to
  }
  const update = (clientY: number) => {
    const d = dragRef.current, g = geo.current
    if (!d || !g) return
    const dy = clientY + window.scrollY - g.startPageY
    setDrag({ from: d.from, dy, to: targetFor(d.from, dy) })
  }
  // while the finger sits near the top or bottom of the screen, keep scrolling
  const autoScroll = () => {
    if (!active.current) return
    const y = lastY.current
    const speed = y < EDGE ? -Math.ceil((EDGE - y) / 6) : y > window.innerHeight - EDGE ? Math.ceil((y - (window.innerHeight - EDGE)) / 6) : 0
    if (speed) { window.scrollBy(0, speed); update(y) }
    raf.current = requestAnimationFrame(autoScroll)
  }
  const finish = (commit: boolean) => {
    window.clearTimeout(press.current?.timer); press.current = null
    cancelAnimationFrame(raf.current)
    const d = dragRef.current
    if (active.current) suppress.current = Date.now() + 400 // the release must not count as a tap
    active.current = false; geo.current = null
    if (commit && d && d.to !== d.from) {
      const next = move(itemsRef.current, d.from, d.to)
      onReorder(next); setNote(`Moved to position ${d.to + 1} of ${next.length}.`)
    }
    setDrag(null)
  }

  const start = (index: number, el: HTMLDivElement, pointerId: number) => {
    const els = rows.current
    const tops = els.map((r) => (r ? r.getBoundingClientRect().top + window.scrollY : 0))
    const heights = els.map((r, i) => { const r0 = r?.getBoundingClientRect(); const next = els[i + 1]?.getBoundingClientRect(); return r0 ? (next ? next.top - r0.top : r0.height) : 0 })
    geo.current = { tops, heights, startPageY: lastY.current + window.scrollY } // where the finger was when the row lifted
    active.current = true
    try { el.setPointerCapture(pointerId) } catch { /* the pointer already ended */ }
    navigator.vibrate?.(12)
    setDrag({ from: index, to: index, dy: 0 })
    raf.current = requestAnimationFrame(autoScroll)
  }

  const onDown = (e: React.PointerEvent<HTMLDivElement>, index: number) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    if ((e.target as HTMLElement).closest('input, select, textarea, a')) return
    window.clearTimeout(press.current?.timer)
    const el = e.currentTarget, id = e.pointerId, x = e.clientX, y = e.clientY
    press.current = { x, y, id, index, timer: window.setTimeout(() => { lastY.current = y; start(index, el, id) }, HOLD_MS) }
  }
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = press.current
    if (!p || p.id !== e.pointerId) return
    if (!active.current) { if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > SLOP) { window.clearTimeout(p.timer); press.current = null } return }
    e.preventDefault(); lastY.current = e.clientY; update(e.clientY)
  }
  const onUp = (e: React.PointerEvent<HTMLDivElement>, commit: boolean) => {
    if (press.current && press.current.id !== e.pointerId) return
    finish(commit)
  }
  const onKey = (e: React.KeyboardEvent<HTMLDivElement>, index: number) => {
    if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return
    const to = index + (e.key === 'ArrowUp' ? -1 : 1)
    if (to < 0 || to >= items.length) return
    e.preventDefault(); onReorder(move(items, index, to)); setNote(`Moved to position ${to + 1} of ${items.length}.`)
  }

  return (
    <div className={`reorder-list ${className ?? ''}`} role="list" aria-label={label} onContextMenu={(e) => e.preventDefault()}>
      {items.map((item, i) => {
        const lifted = drag?.from === i
        let shift = 0
        if (drag && !lifted) {
          const h = geo.current?.heights[drag.from] ?? 0
          if (drag.from < drag.to && i > drag.from && i <= drag.to) shift = -h
          else if (drag.from > drag.to && i >= drag.to && i < drag.from) shift = h
        }
        return (
          <div key={getKey(item)} role="listitem" ref={(el) => { rows.current[i] = el }}
            className={`reorder-row${lifted ? ' is-lifted' : ''}${drag && !lifted ? ' is-making-room' : ''}`}
            style={lifted ? { transform: `translateY(${drag!.dy}px) scale(1.025)` } : shift ? { transform: `translateY(${shift}px)` } : undefined}
            onPointerDown={(e) => onDown(e, i)} onPointerMove={onMove} onPointerUp={(e) => onUp(e, true)} onPointerCancel={(e) => onUp(e, false)} onLostPointerCapture={(e) => { if (active.current) onUp(e, true) }}
            onClickCapture={(e) => { if (Date.now() < suppress.current) { e.preventDefault(); e.stopPropagation() } }}
            onKeyDown={(e) => onKey(e, i)}>
            {children(item, i)}
          </div>
        )
      })}
      <span className="sr-only" role="status" aria-live="polite">{note}</span>
    </div>
  )
}
