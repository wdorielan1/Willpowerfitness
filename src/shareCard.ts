import type { LogEntry, WorkoutLog } from './types'
import { e1rm } from './engine'

export interface PR { name: string; weight: number; reps: number; pct: number }
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
    if (prev > 0 && now > prev) out.push({ name: e.name, weight: top.weight, reps: top.reps, pct: Math.round(((now - prev) / prev) * 1000) / 10 })
  }
  return out.sort((a, b) => b.pct - a.pct)
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

/** Draw a 1080x1350 branded card (fits Instagram feed and stories crops). */
export async function buildShareCard(s: WorkoutSummary): Promise<Blob> {
  const W = 1080, H = 1350
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d')!
  const font = '-apple-system, "Segoe UI", Helvetica, Arial, sans-serif'
  g.fillStyle = '#0d0e10'; g.fillRect(0, 0, W, H)
  const glow = g.createRadialGradient(W / 2, 0, 60, W / 2, 0, 900)
  glow.addColorStop(0, 'rgba(255,107,61,.35)'); glow.addColorStop(1, 'rgba(255,107,61,0)')
  g.fillStyle = glow; g.fillRect(0, 0, W, H)

  g.textBaseline = 'alphabetic'
  g.fillStyle = '#ff6b3d'; g.font = `800 34px ${font}`; g.fillText('WILL POWER', 80, 120)
  g.fillStyle = '#a8aab3'; g.font = `500 30px ${font}`
  const when = new Date(s.finishedAt).toLocaleString(undefined, { weekday: 'long', hour: 'numeric', minute: '2-digit' })
  g.fillText(`${when}${s.place ? ` · ${s.place}` : ''}`.slice(0, 54), 80, 175)

  g.fillStyle = '#f5f5f7'; g.font = `800 96px ${font}`
  g.fillText(s.title.slice(0, 18), 80, 320)
  g.font = `700 52px ${font}`; g.fillStyle = '#c6c9d2'; g.fillText('Workout complete', 80, 390)

  const stats: [string, string][] = [
    [s.minutes ? `${s.minutes}` : '–', 'MINUTES'],
    [String(s.sets), 'SETS'],
    [s.volume.toLocaleString(), 'LB LIFTED'],
  ]
  stats.forEach(([v, l], i) => {
    const x = 80 + i * 300
    g.fillStyle = '#f5f5f7'; g.font = `800 82px ${font}`; g.fillText(v, x, 540)
    g.fillStyle = '#a8aab3'; g.font = `700 26px ${font}`; g.fillText(l, x, 585)
  })
  if (s.volumeChangePct !== null && s.volumeChangePct !== 0) {
    g.fillStyle = s.volumeChangePct > 0 ? '#34c759' : '#a8aab3'; g.font = `700 34px ${font}`
    g.fillText(`${s.volumeChangePct > 0 ? '▲' : '▼'} ${Math.abs(s.volumeChangePct)}% volume vs last ${s.title.toLowerCase()}`.slice(0, 48), 80, 650)
  }

  let y = 760
  if (s.prs.length) {
    g.fillStyle = '#ff6b3d'; g.font = `800 34px ${font}`; g.fillText('NEW PERSONAL RECORDS', 80, y); y += 30
    s.prs.slice(0, 3).forEach((pr) => {
      y += 90
      g.fillStyle = '#f5f5f7'; g.font = `700 50px ${font}`; g.fillText(pr.name.slice(0, 24), 80, y)
      g.fillStyle = '#34c759'; g.font = `800 50px ${font}`
      const tag = `+${pr.pct}%`; g.fillText(tag, W - 80 - g.measureText(tag).width, y)
      g.fillStyle = '#a8aab3'; g.font = `500 30px ${font}`; g.fillText(`${pr.weight} lb × ${pr.reps}`, 80, y + 42); y += 42
    })
  } else {
    g.fillStyle = '#a8aab3'; g.font = `500 40px ${font}`
    g.fillText(`${s.exercises} exercise${s.exercises === 1 ? '' : 's'} done. Showing up counts.`, 80, y + 20)
  }

  if (s.streak > 1) {
    g.fillStyle = '#f5f5f7'; g.font = `800 44px ${font}`; g.fillText(`🔥 ${s.streak}-day streak`, 80, H - 170)
  }
  g.fillStyle = '#a8aab3'; g.font = `600 30px ${font}`; g.fillText('Wake Up. Show Up. Lift.', 80, H - 100)
  g.fillStyle = '#ff6b3d'; g.font = `800 30px ${font}`
  const url = 'wilpow.com'; g.fillText(url, W - 80 - g.measureText(url).width, H - 100)

  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Could not make the image'))), 'image/png'))
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
