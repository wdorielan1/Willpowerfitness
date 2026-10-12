import type { LogEntry, WorkoutLog } from './types'
import { e1rm } from './engine'

export interface PR { name: string; weight: number; reps: number; pct: number; e1: number }
export interface WorkoutSummary {
  title: string
  date: string
  finishedAt: number
  minutes?: number
  sets: number
  volume: number
  exercises: number
  volumeChangePct: number | null
  prs: PR[]
  streak: number
  place?: string
}

const best = (e: LogEntry) => e.sets.reduce((b, s) => (e1rm(s.weight, s.reps) > e1rm(b.weight, b.reps) ? s : b))
const volumeOf = (entries: LogEntry[]) => Math.round(entries.reduce((a, e) => a + e.sets.reduce((s, x) => s + x.weight * x.reps, 0), 0))

/** A PR is a better estimated one-rep max than every earlier log of the same lift. A first-ever log is not a PR. */
export function computePRs(entries: LogEntry[], history: WorkoutLog[], date: string): PR[] {
  const past = history.filter((l) => l.date !== date && !l.skipped)
  const out: PR[] = []
  for (const e of entries) {
    if (!e.sets.length) continue
    const prior = past.flatMap((l) => l.entries.filter((x) => x.exId === e.exId && x.sets.length)).map((x) => e1rm(best(x).weight, best(x).reps))
    if (!prior.length) continue
    const top = best(e)
    const prev = Math.max(...prior)
    const now = e1rm(top.weight, top.reps)
    if (prev > 0 && now > prev) out.push({ name: e.name, weight: top.weight, reps: top.reps, pct: Math.round(((now - prev) / prev) * 1000) / 10, e1: now })
  }
  // heaviest lift leads: a bench PR is a bigger brag than a curl PR with a larger % jump
  return out.sort((a, b) => b.e1 - a.e1)
}

/** Volume change against the most recent earlier session of the same day type. */
export function volumeChange(entries: LogEntry[], history: WorkoutLog[], date: string, dayType: string): number | null {
  const prev = history.filter((l) => l.date < date && !l.skipped && !l.baseline && l.dayType === dayType && l.entries.length).sort((a, b) => b.date.localeCompare(a.date))[0]
  if (!prev) return null
  const before = volumeOf(prev.entries)
  if (!before) return null
  return Math.round(((volumeOf(entries) - before) / before) * 100)
}

export const summarize = (p: { title: string; date: string; finishedAt: number; minutes?: number; entries: LogEntry[]; history: WorkoutLog[]; dayType: string; streak: number; place?: string }): WorkoutSummary => ({
  title: p.title, date: p.date, finishedAt: p.finishedAt, minutes: p.minutes,
  sets: p.entries.reduce((a, e) => a + e.sets.length, 0),
  volume: volumeOf(p.entries),
  exercises: p.entries.length,
  volumeChangePct: volumeChange(p.entries, p.history, p.date, p.dayType),
  prs: computePRs(p.entries, p.history, p.date),
  streak: p.streak,
  place: p.place?.trim() || undefined,
})

export const prLine = (pr: PR) => `${pr.name} ${pr.weight} lb × ${pr.reps} (+${pr.pct}%)`

export type CardFormat = 'story' | 'post'

export const fmtDuration = (m?: number) => (!m ? '–' : m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m} min`)

// The W mark from public/logo.svg (viewBox 289 51 860 860), drawn without its black tile.
const MARK = ['M323 380H434L678 748L620 845Z', 'M726 117L907 398L785 592L887 748L830 840L544 399ZM726 294L795 399L726 503L657 399Z', 'M1004 380H1116L930 681L872 591Z']
const C = { bg: '#0b0c0e', panel: '#16171b', line: '#2a2c33', text: '#f5f5f7', mute: '#9c9fa9', accent: '#ff6b3d', green: '#34c759' }
const F = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

/** Draw the branded share picture: 1080x1920 for stories, 1080x1350 for feed posts. */
export async function buildShareCard(s: WorkoutSummary, format: CardFormat = 'story'): Promise<Blob> {
  const W = 1080, H = format === 'story' ? 1920 : 1350, M = 88
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H
  const g = cv.getContext('2d')!
  const spacing = (px: number) => { (g as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${px}px` }
  const font = (w: number, size: number) => { g.font = `${w} ${size}px ${F}` }
  const fit = (text: string, w: number, size: number, max: number, min = 28) => { let n = size; for (; n > min; n -= 4) { font(w, n); if (g.measureText(text).width <= max) break } return n }
  const mark = (x: number, y: number, size: number, color: string) => {
    g.save(); g.translate(x, y); g.scale(size / 860, size / 860); g.translate(-289, -51); g.fillStyle = color
    MARK.forEach((d) => g.fill(new Path2D(d), 'evenodd')); g.restore()
  }
  const round = (x: number, y: number, w: number, h: number, r: number) => { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h) }
  const pill = (text: string, x: number, y: number, color: string, bg: string, size = 28) => {
    font(800, size); spacing(2); const w = g.measureText(text).width + 44, h = size + 30
    round(x, y, w, h, h / 2); g.fillStyle = bg; g.fill()
    g.fillStyle = color; g.fillText(text, x + 22, y + h / 2 + size * 0.36); spacing(0)
    return w
  }

  // ---- background: deep black, warm glow behind the hero, a large faint W ----
  g.fillStyle = C.bg; g.fillRect(0, 0, W, H)
  const glow = g.createRadialGradient(W * 0.15, H * 0.3, 40, W * 0.15, H * 0.3, H * 0.62)
  glow.addColorStop(0, 'rgba(255,107,61,.30)'); glow.addColorStop(1, 'rgba(255,107,61,0)')
  g.fillStyle = glow; g.fillRect(0, 0, W, H)
  mark(W - 640, H - 820, 980, 'rgba(255,255,255,.035)')

  // ---- header: mark + wordmark left, session and time right ----
  mark(M, M, 76, C.text)
  font(800, 30); spacing(6); g.fillStyle = C.text; g.fillText('WILL POWER', M + 100, M + 50); spacing(0)
  const when = new Date(s.finishedAt)
  const day = when.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  const time = when.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  g.textAlign = 'right'
  font(700, 28); g.fillStyle = C.text; g.fillText(`${day} · ${time}`, W - M, M + 30)
  if (s.place) { fit(s.place, 600, 26, 420, 18); g.fillStyle = C.mute; g.fillText(s.place, W - M, M + 70) }
  g.textAlign = 'left'
  const top = M + 150

  // ---- footer ----
  const footY = H - M
  g.fillStyle = C.line; g.fillRect(M, footY - 78, W - 2 * M, 2)
  font(600, 30); g.fillStyle = C.mute; g.fillText('Wake Up. Show Up. Lift.', M, footY)
  g.textAlign = 'right'; font(800, 30); g.fillStyle = C.accent; g.fillText('wilpow.com', W - M, footY); g.textAlign = 'left'
  const bottom = footY - 130

  // ---- middle: measured blocks, centred in the free space ----
  type Block = { h: number; draw: (y: number) => void }
  const blocks: Block[] = []
  const gap = format === 'story' ? 64 : 44
  const [hero, ...more] = s.prs
  const maxW = W - 2 * M

  if (hero) {
    blocks.push({ h: 58, draw: (y) => { pill('NEW PR', M, y, C.green, 'rgba(52,199,89,.16)') } })
    const nameSize = fit(hero.name, 800, 76, maxW, 44)
    blocks.push({ h: nameSize * 1.05, draw: (y) => { font(800, nameSize); g.fillStyle = C.text; g.fillText(hero.name, M, y + nameSize * 0.82) } })
    const parts: [string, number, number, string][] = [[String(hero.weight), 900, 210, C.text], [' lb', 700, 64, C.mute], [` × ${hero.reps}`, 800, 120, C.text]]
    const total = () => parts.reduce((a, [t, w, z]) => { font(w, z); return a + g.measureText(t).width }, 0)
    const k = Math.min(1, maxW / total()); parts.forEach((p) => { p[2] = Math.round(p[2] * k) })
    const big = parts[0][2]
    blocks.push({ h: big * 0.8, draw: (y) => { let x = M; parts.forEach(([t, w, z, c]) => { font(w, z); g.fillStyle = c; g.fillText(t, x, y + big * 0.78); x += g.measureText(t).width }) } })
    blocks.push({ h: 52, draw: (y) => { font(700, 42); g.fillStyle = C.green; g.fillText(`+${hero.pct}% over your best`, M, y + 40) } })
  } else {
    blocks.push({ h: 58, draw: (y) => { pill('WORKOUT COMPLETE', M, y, C.accent, 'rgba(255,107,61,.16)') } })
    const title = s.title.toUpperCase()
    const size = fit(title, 900, format === 'story' ? 240 : 200, maxW, 100)
    blocks.push({ h: size * 0.78, draw: (y) => { font(900, size); g.fillStyle = C.text; g.fillText(title, M - size * 0.04, y + size * 0.76) } })
    blocks.push({ h: 56, draw: (y) => { font(600, 44); g.fillStyle = C.mute; g.fillText('Showed up. Did the work.', M, y + 44) } })
  }

  // stats panel
  const stats: [string, string][] = [[fmtDuration(s.minutes), 'TIME'], [String(s.sets), 'SETS'], [s.volume.toLocaleString(), 'LB MOVED']]
  blocks.push({ h: 210, draw: (y) => {
    round(M, y, maxW, 210, 36); g.fillStyle = C.panel; g.fill(); g.strokeStyle = C.line; g.lineWidth = 2; g.stroke()
    const col = maxW / 3
    stats.forEach(([v, l], i) => {
      const x = M + col * i + 40
      if (i) { g.fillStyle = C.line; g.fillRect(M + col * i, y + 44, 2, 122) }
      fit(v, 800, 64, col - 64, 34); g.fillStyle = C.text; g.fillText(v, x, y + 108)
      font(700, 24); spacing(3); g.fillStyle = C.mute; g.fillText(l, x, y + 158); spacing(0)
    })
  } })

  // momentum pills: volume change and streak
  const chips: [string, string, string][] = []
  if (s.volumeChangePct !== null && s.volumeChangePct > 0) chips.push([`▲ ${s.volumeChangePct}% MORE VOLUME`, C.green, 'rgba(52,199,89,.16)'])
  if (s.streak > 1) chips.push([`${s.streak}-DAY STREAK`, C.accent, 'rgba(255,107,61,.16)'])
  if (chips.length) blocks.push({ h: 58, draw: (y) => { let x = M; chips.forEach(([t, c, bg]) => { x += pill(t, x, y, c, bg) + 16 }) } })

  // any other PRs, as many as fit
  const height = (list: Block[]) => list.reduce((a, b) => a + b.h, 0) + gap * (list.length - 1)
  const others = (n: number): Block => ({ h: 48 + n * 104, draw: (y) => {
    font(700, 26); spacing(4); g.fillStyle = C.mute; g.fillText('ALSO NEW PRS', M, y + 28); spacing(0)
    more.slice(0, n).forEach((pr, i) => {
      const r = y + 48 + i * 104
      fit(pr.name, 700, 44, maxW - 220); g.fillStyle = C.text; g.fillText(pr.name, M, r + 48)
      font(500, 30); g.fillStyle = C.mute; g.fillText(`${pr.weight} lb × ${pr.reps}`, M, r + 88)
      g.textAlign = 'right'; font(800, 44); g.fillStyle = C.green; g.fillText(`+${pr.pct}%`, W - M, r + 48); g.textAlign = 'left'
    })
  } })
  let n = Math.min(3, more.length)
  while (n && height([...blocks, others(n)]) > bottom - top) n--
  if (n) blocks.push(others(n))

  let y = top + Math.max(0, (bottom - top - height(blocks)) * (format === 'story' ? 0.45 : 0.5))
  blocks.forEach((b) => { b.draw(y); y += b.h + gap })

  return new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error('Could not make the image'))), 'image/png'))
}

/** Open the phone's share sheet with the image; fall back to a download. Returns what happened. */
export async function shareCard(blob: Blob, text: string): Promise<'shared' | 'saved' | 'cancelled'> {
  const file = new File([blob], 'will-power-workout.png', { type: 'image/png' })
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try { await nav.share({ files: [file], text }); return 'shared' } catch (e) { if ((e as Error).name === 'AbortError') return 'cancelled' }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  return 'saved'
}
