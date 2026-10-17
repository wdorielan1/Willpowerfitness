import type { WorkoutSummary } from './shareCard'
import type { StickerStyle, StickerTextColor } from './types'

// The same W paths as the original share card, without the logo's black tile.
export const MARK = ['M323 380H434L678 748L620 845Z', 'M726 117L907 398L785 592L887 748L830 840L544 399ZM726 294L795 399L726 503L657 399Z', 'M1004 380H1116L930 681L872 591Z']
const ACCENT = '#ff6b3d'
const GREEN = '#34c759'
const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
const SIGNATURE = 'Powered by Will Power · wilpow.com'
const CONTENT_WIDTH = 880
const SHADOW_SPACE = 24

type Draw = (g: CanvasRenderingContext2D) => void

const number = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 2 })
const signed = (value: number) => `${value >= 0 ? '+' : '−'}${number(Math.abs(value))}%`
const duration = (minutes: number) => minutes >= 60
  ? `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${number(minutes % 60)}m` : ''}`
  : `${number(minutes)} min`

/** A transparent, tightly cropped sticker. No photo or user information leaves the browser. */
export async function buildWorkoutSticker(
  summary: WorkoutSummary,
  style: StickerStyle = 'minimal',
  color: StickerTextColor = 'white',
): Promise<Blob> {
  const measureCanvas = document.createElement('canvas')
  const measure = measureCanvas.getContext('2d')
  if (!measure) throw new Error('This browser cannot create a workout sticker.')

  const ink = color === 'dark' ? '#101114' : '#ffffff'
  // Deeper brand colors with dark text, so they hold contrast on bright photos.
  const green = color === 'dark' ? '#15803d' : GREEN
  const accent = color === 'dark' ? '#d9480f' : ACCENT
  // Small text gets a thin contrasting outline under the fill so it stays readable on bright, busy photos.
  const halo = color === 'dark' ? 'rgba(255,255,255,.6)' : 'rgba(0,0,0,.5)'
  const ink2 = (g: CanvasRenderingContext2D, value: string, x: number, y: number, size: number) => {
    if (size < 50) { g.save(); g.lineJoin = 'round'; g.lineWidth = Math.max(3, size * 0.14); g.strokeStyle = halo; g.strokeText(value, x, y); g.restore() }
    g.fillText(value, x, y)
  }
  const draws: Draw[] = []
  let y = 0
  const font = (weight: number, size: number) => `${weight} ${size}px ${FONT}`

  // Wrap even long, unbroken exercise/place names, preserving every PR rather than clipping.
  const linesFor = (text: string, weight: number, size: number, width = CONTENT_WIDTH): string[] => {
    measure.font = font(weight, size)
    const lines: string[] = []
    let line = ''
    for (const word of text.trim().split(/\s+/)) {
      const next = line ? `${line} ${word}` : word
      if (measure.measureText(next).width <= width) { line = next; continue }
      if (line) { lines.push(line); line = '' }
      for (const char of Array.from(word)) {
        if (line && measure.measureText(line + char).width > width) { lines.push(line); line = '' }
        line += char
      }
    }
    if (line) lines.push(line)
    return lines.length ? lines : ['']
  }

  const text = (value: string, size: number, weight = 700, fill = ink, gap = 10, width = CONTENT_WIDTH) => {
    const lines = linesFor(value, weight, size, width)
    const top = y
    const lineHeight = size * 1.15
    draws.push((g) => {
      g.font = font(weight, size)
      g.fillStyle = fill
      lines.forEach((line, i) => ink2(g, line, 0, top + i * lineHeight, size))
    })
    y += lines.length * lineHeight + gap
  }

  const header = (label: string, labelColor = ink) => {
    const top = y
    draws.push((g) => {
      g.save()
      // Actual path bounds are 323..1116 / 117..845. Align the visible mark with the text.
      g.translate(0, top)
      g.scale(82 / 793, 82 / 793)
      g.translate(-323, -117)
      g.fillStyle = ink
      for (const path of MARK) g.fill(new Path2D(path), 'evenodd')
      g.restore()
      g.fillStyle = labelColor
      g.font = font(800, 32)
      ink2(g, label, 108, top + 23, 32)
    })
    y += 104
  }

  const lift = (weight: number, reps: number, baseSize: number) => {
    const value = `${number(weight)} lb × ${number(reps)}`
    let size = baseSize
    measure.font = font(900, size)
    while (measure.measureText(value).width > CONTENT_WIDTH && size > 48) {
      size -= 2
      measure.font = font(900, size)
    }
    text(value, size, 900, ink, 3)
  }

  const stats = () => {
    y += 14
    const timed = summary.minutes !== undefined && Number.isFinite(summary.minutes) ? [{ value: duration(summary.minutes!), label: 'TIME' }] : []
    // a cardio session shows time and miles; a lift shows weight moved, sets and time
    const cells = summary.activity
      ? [...timed, ...(summary.activity.miles ? [{ value: number(summary.activity.miles), label: 'MILES' }] : [])]
      : [{ value: number(summary.volume), label: 'LB MOVED' }, { value: number(summary.sets), label: 'SETS' }, ...timed]
    const top = y
    const cellWidth = CONTENT_WIDTH / cells.length
    draws.push((g) => cells.forEach((cell, i) => {
      let size = 48
      g.font = font(800, size)
      while (g.measureText(cell.value).width > cellWidth - 22 && size > 22) {
        size -= 2
        g.font = font(800, size)
      }
      g.fillStyle = ink
      ink2(g, cell.value, i * cellWidth, top, size)
      g.font = font(700, 21)
      ink2(g, cell.label, i * cellWidth, top + 61, 21)
    }))
    y += 105
  }

  const achievements = () => {
    if (summary.volumeChangePct !== null && Number.isFinite(summary.volumeChangePct)) {
      text(`${signed(summary.volumeChangePct)} volume vs last session`, 29, 700,
        summary.volumeChangePct > 0 ? green : ink, 10)
    }
    if (summary.streak > 1) text(`${number(summary.streak)}-day streak`, 29, 700, accent, 10)
    if (summary.place?.trim()) text(summary.place.trim(), 25, 600, ink, 10)
  }

  const hero = summary.prs[0]
  if (style === 'full') {
    header(summary.activity ? 'SESSION COMPLETE' : 'WORKOUT COMPLETE')
    text(summary.title.toUpperCase(), 44, 800, ink, 18)
    if (summary.prs.length) {
      text(`${summary.prs.length} NEW ${summary.prs.length === 1 ? 'PR' : 'PRS'}`, 28, 800, green, 18)
      for (const pr of summary.prs) {
        text(pr.name, 36, 800, ink, 2)
        text(`${number(pr.weight)} lb × ${number(pr.reps)}  ·  ${signed(pr.pct)}`, 33, 700, ink, 24)
      }
    }
    stats()
    achievements()
  } else {
    header(hero ? 'NEW PR' : summary.activity ? 'SESSION COMPLETE' : 'WORKOUT COMPLETE', hero ? green : ink)
    if (hero) {
      text(hero.name, style === 'minimal' ? 46 : 43, 800, ink, 9)
      lift(hero.weight, hero.reps, style === 'minimal' ? 148 : 126)
      text(`${signed(hero.pct)} improvement`, style === 'minimal' ? 40 : 35, 700, green, 12)
    } else {
      text(summary.title.toUpperCase(), style === 'minimal' ? 108 : 90, 900, ink, 12)
    }
    if (style === 'performance') { stats(); achievements() }
  }

  y += 16
  text(SIGNATURE, 24, 600, ink, 0)

  // Keep memory bounded on phones even if an imported session has a very long PR list.
  // Layout all rows first; scale the complete result instead of dropping achievements.
  const logicalWidth = CONTENT_WIDTH + SHADOW_SPACE * 2
  const logicalHeight = Math.ceil(y + SHADOW_SPACE * 2)
  const scale = Math.min(1, 4096 / logicalHeight, Math.sqrt(8_000_000 / (logicalWidth * logicalHeight)))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.ceil(logicalWidth * scale))
  canvas.height = Math.max(1, Math.ceil(logicalHeight * scale))
  const g = canvas.getContext('2d')
  if (!g) throw new Error('This browser cannot create a workout sticker.')
  g.scale(scale, scale)
  g.translate(SHADOW_SPACE, SHADOW_SPACE)
  g.textBaseline = 'top'
  g.shadowColor = color === 'dark' ? 'rgba(255,255,255,.9)' : 'rgba(0,0,0,.85)'
  g.shadowBlur = 8 * scale
  g.shadowOffsetY = 2 * scale
  for (const draw of draws) draw(g)

  // Crop against real alpha, including the soft shadow, so there is no invisible frame.
  const pixels = g.getImageData(0, 0, canvas.width, canvas.height).data
  let left = canvas.width, right = -1, top = canvas.height, bottom = -1
  for (let row = 0; row < canvas.height; row++) {
    for (let col = 0; col < canvas.width; col++) {
      if (!pixels[(row * canvas.width + col) * 4 + 3]) continue
      left = Math.min(left, col)
      right = Math.max(right, col)
      top = Math.min(top, row)
      bottom = Math.max(bottom, row)
    }
  }
  if (right < left || bottom < top) throw new Error('The workout sticker was empty.')
  const output = document.createElement('canvas')
  output.width = right - left + 1
  output.height = bottom - top + 1
  const outputContext = output.getContext('2d')
  if (!outputContext) throw new Error('This browser cannot create a workout sticker.')
  outputContext.drawImage(canvas, left, top, output.width, output.height, 0, 0, output.width, output.height)
  const blob = await new Promise<Blob>((resolve, reject) => output.toBlob(
    (result) => result ? resolve(result) : reject(new Error('Could not make the workout sticker.')),
    'image/png',
  ))
  // Release the larger backing store promptly rather than waiting for a phone's next GC.
  canvas.width = canvas.height = measureCanvas.width = measureCanvas.height = output.width = output.height = 1
  return blob
}
