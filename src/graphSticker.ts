import { MARK } from './shareSticker'
import { fromISO } from './engine'
import { movingAverage, type WeightPoint } from './WeightChart'
import type { StickerTextColor } from './types'

export interface GraphStickerData {
  /** small label above the number, e.g. "BODY WEIGHT" */
  title: string
  /** the big number, e.g. "−10.2 lb" */
  headline: string
  /** under the number, e.g. "Last 90 days · 7-day averages" */
  note: string
  pts: WeightPoint[]
  unit: string
  /** draw a 7-day average line over the daily readings (body weight) */
  smooth: boolean
  /** leave out the start and latest numbers, so only the line and the change are shown */
  hideValues?: boolean
}

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
const W = 880, SHADOW = 24, GRAPH_H = 320
const dayNum = (iso: string) => Math.round(fromISO(iso).getTime() / 86400000)
const dayLabel = (iso: string) => fromISO(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
const num = (v: number) => (Math.round(v * 10) / 10).toLocaleString('en-US', { maximumFractionDigits: 1 })

/** A transparent, tightly cropped progress graph to lay over a photo. Nothing leaves the browser. */
export async function buildGraphSticker(g: GraphStickerData, color: StickerTextColor = 'white'): Promise<Blob> {
  if (g.pts.length < 2) throw new Error('Not enough data for a graph.')
  const ink = color === 'dark' ? '#101114' : '#ffffff'
  const faint = color === 'dark' ? 'rgba(16,17,20,.45)' : 'rgba(255,255,255,.5)'
  const accent = color === 'dark' ? '#d9480f' : '#ff6b3d'
  const halo = color === 'dark' ? 'rgba(255,255,255,.6)' : 'rgba(0,0,0,.5)'
  const height = 104 + 150 + 56 + GRAPH_H + 70 + 40
  const cv = document.createElement('canvas')
  cv.width = W + SHADOW * 2; cv.height = height + SHADOW * 2
  const c = cv.getContext('2d')
  if (!c) throw new Error('This browser cannot create a progress sticker.')
  c.translate(SHADOW, SHADOW)
  c.textBaseline = 'top'
  c.shadowColor = color === 'dark' ? 'rgba(255,255,255,.9)' : 'rgba(0,0,0,.85)'
  c.shadowBlur = 8; c.shadowOffsetY = 2
  const font = (w: number, s: number) => { c.font = `${w} ${s}px ${FONT}` }
  const text = (t: string, x: number, y: number, s: number, w = 700, fill = ink, align: CanvasTextAlign = 'left') => {
    font(w, s); c.textAlign = align; c.fillStyle = fill
    if (s < 50) { c.save(); c.lineJoin = 'round'; c.lineWidth = Math.max(3, s * 0.14); c.strokeStyle = halo; c.strokeText(t, x, y); c.restore() }
    c.fillText(t, x, y)
  }

  // header: the W mark and what this graph is
  c.save(); c.translate(0, 0); c.scale(82 / 793, 82 / 793); c.translate(-323, -117); c.fillStyle = ink
  for (const p of MARK) c.fill(new Path2D(p), 'evenodd')
  c.restore()
  text(g.title.toUpperCase(), 108, 22, 32, 800)

  // the number and what it covers
  let y = 104
  text(g.headline, 0, y, 140, 900)
  y += 150
  text(g.note, 0, y, 30, 700, accent)
  y += 56

  // the graph, on a real time axis so missed days show as gaps
  const avg = g.smooth && g.pts.length >= 7 ? movingAverage(g.pts) : null
  const ys = [...g.pts.map((p) => p.y), ...(avg?.map((p) => p.y) ?? [])]
  const pad = Math.max(0.5, (Math.max(...ys) - Math.min(...ys)) * 0.14)
  const lo = Math.min(...ys) - pad, hi = Math.max(...ys) + pad
  const t0 = dayNum(g.pts[0].x), t1 = dayNum(g.pts[g.pts.length - 1].x), span = Math.max(1, t1 - t0)
  const gx = 30, gw = W - 60
  const X = (iso: string) => gx + ((dayNum(iso) - t0) / span) * gw
  const Y = (v: number) => y + 20 + (1 - (v - lo) / (hi - lo)) * (GRAPH_H - 40)
  const stroke = (pts: WeightPoint[], style: string, width: number) => {
    c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(X(p.x), Y(p.y)) : c.moveTo(X(p.x), Y(p.y))))
    c.strokeStyle = style; c.lineWidth = width; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke()
  }
  stroke(g.pts, avg ? faint : accent, avg ? 3 : 8)
  if (avg) stroke(avg, accent, 9)
  else if (g.pts.length <= 24) for (const p of g.pts) { c.beginPath(); c.arc(X(p.x), Y(p.y), 9, 0, Math.PI * 2); c.fillStyle = accent; c.fill() }
  // the first and last values, with a dot on the end of the line
  const first = avg ? avg[0] : g.pts[0], last = avg ? avg[avg.length - 1] : g.pts[g.pts.length - 1]
  for (const p of [first, last]) { c.beginPath(); c.arc(X(p.x), Y(p.y), 13, 0, Math.PI * 2); c.fillStyle = ink; c.fill() }
  if (!g.hideValues) {
    text(`${num(first.y)} ${g.unit}`, X(first.x) + 14, Y(first.y) - (Y(first.y) > y + 80 ? 56 : -22), 34, 800, ink, 'left')
    text(`${num(last.y)} ${g.unit}`, X(last.x) - 14, Y(last.y) - (Y(last.y) > y + 80 ? 56 : -22), 34, 800, ink, 'right')
  }
  y += GRAPH_H + 14
  text(dayLabel(g.pts[0].x), gx, y, 28, 700, ink, 'left')
  text(dayLabel(g.pts[g.pts.length - 1].x), gx + gw, y, 28, 700, ink, 'right')
  y += 62
  text('Powered by Will Power · wilpow.com', 0, y, 24, 600)

  // trim the empty space around everything that was drawn (including the soft shadow)
  const px = c.getImageData(0, 0, cv.width, cv.height).data
  let l = cv.width, r = -1, t = cv.height, b = -1
  for (let row = 0; row < cv.height; row++) for (let col = 0; col < cv.width; col++) {
    if (!px[(row * cv.width + col) * 4 + 3]) continue
    l = Math.min(l, col); r = Math.max(r, col); t = Math.min(t, row); b = Math.max(b, row)
  }
  if (r < l || b < t) throw new Error('The progress sticker was empty.')
  const out = document.createElement('canvas')
  out.width = r - l + 1; out.height = b - t + 1
  out.getContext('2d')!.drawImage(cv, l, t, out.width, out.height, 0, 0, out.width, out.height)
  const blob = await new Promise<Blob>((res, rej) => out.toBlob((x) => (x ? res(x) : rej(new Error('Could not make the sticker.'))), 'image/png'))
  cv.width = cv.height = out.width = out.height = 1
  return blob
}
