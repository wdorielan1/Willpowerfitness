import type { CardFormat, PR, WorkoutSummary } from './shareCard'

export type WorkoutCardStyle = 'scorecard' | 'photo' | 'receipt' | 'pr'
export interface WorkoutCardOptions {
  style?: WorkoutCardStyle
  photo?: HTMLCanvasElement | null
  /** Small gallery previews use identical geometry without allocating a full-size image. */
  width?: number
}
export const WORKOUT_CARD_STYLES: { id: WorkoutCardStyle; name: string; detail: string }[] = [
  { id: 'scorecard', name: 'Scorecard', detail: 'Your session, in bold.' },
  { id: 'photo', name: 'Photo Flex', detail: 'Your photo. Your hard work.' },
  { id: 'receipt', name: 'Training Receipt', detail: 'Every lift accounted for.' },
  { id: 'pr', name: 'PR Poster', detail: 'Give your best a spotlight.' },
]

const C = { bg: '#101315', paper: '#eee9df', ink: '#202221', text: '#f6f3eb', mute: '#a7adad', orange: '#ff6928', line: '#414747' }
const SANS = 'Arial, Helvetica, sans-serif'
const MONO = '"Courier New", monospace'
const DISPLAY = '"Willpower Display", "Arial Narrow", Arial, sans-serif'
let displayReady: Promise<void> | undefined
function loadDisplayFont(): Promise<void> {
  return displayReady ??= (async () => {
    try {
      const face = new FontFace('Willpower Display', `url(${import.meta.env.BASE_URL}fonts/BarlowCondensed-Black.ttf)`, { weight: '900' })
      document.fonts.add(await face.load())
    } catch { /* System fonts still produce a shareable card when the local font cannot load. */ }
  })()
}
const MARK = ['M323 380H434L678 748L620 845Z', 'M726 117L907 398L785 592L887 748L830 840L544 399ZM726 294L795 399L726 503L657 399Z', 'M1004 380H1116L930 681L872 591Z']
const number = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 1 })
const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${number(Math.abs(n))}%`
const title = (s: string) => ({ Push: 'Push Day', Pull: 'Pull Day', Legs: 'Leg Day', 'Full Body': 'Full Body Day' }[s] ?? s).toUpperCase()

/** The PR percentage measures estimated 1RM, not an increase in the weight on the bar. */
export function previousBest(pr: PR): number {
  return pr.previousE1 ?? pr.e1 / (1 + pr.pct / 100)
}

/** All artwork is local canvas drawing: no remote fonts, photos, or screenshot dependencies. */
export async function renderWorkoutCard(s: WorkoutSummary, format: CardFormat, options: WorkoutCardOptions): Promise<Blob> {
  await loadDisplayFont()
  const style = options.style ?? 'scorecard', W = 1080, H = format === 'story' ? 1920 : 1350
  const cv = document.createElement('canvas')
  cv.width = Math.max(1, Math.min(W, options.width ?? W)); cv.height = Math.round(cv.width * H / W)
  const g = cv.getContext('2d')
  if (!g) throw new Error('Could not make your workout card.')
  g.scale(cv.width / W, cv.width / W)
  const M = 78, R = W - M, span = R - M, top = format === 'story' ? 200 : 82, bottom = H - top, area = bottom - top
  const line = (x: number, y: number, w: number, color = C.line, thick = 2) => { g.fillStyle = color; g.fillRect(x, y, w, thick) }
  const text = (value: string, x: number, y: number, size: number, color = C.text, weight = 700, max = span, mono = false) => {
    g.font = `${weight} ${size}px ${mono ? MONO : weight === 900 ? DISPLAY : SANS}`; g.fillStyle = color
    g.fillText(value, x, y, max)
  }
  const label = (value: string, x: number, y: number, color = C.mute, max = span) => text(value, x, y, 24, color, 600, max, true)
  const brand = (y: number, ink = C.text) => {
    g.save(); g.translate(M - 8, y - 39); g.scale(68 / 860, 68 / 860); g.translate(-289, -51); g.fillStyle = C.orange
    MARK.forEach((d) => g.fill(new Path2D(d), 'evenodd')); g.restore()
    text('W I L L P O W E R', M + 80, y + 6, 27, ink, 800, 510)
  }
  const wrap = (value: string, x: number, y: number, size: number, width: number, color = C.text, maxLines = 2) => {
    g.font = `900 ${size}px ${DISPLAY}`
    const words = value.split(/\s+/), lines: string[] = []; let current = ''
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word
      if (current && g.measureText(candidate).width > width && lines.length < maxLines - 1) { lines.push(current); current = word } else current = candidate
    }
    if (current) lines.push(current)
    lines.forEach((v, i) => text(v, x, y + i * size * .94, size, color, 900, width))
    return lines.length * size * .94
  }
  const texture = (light = false) => {
    // Seeded, subtle grain keeps thumbnails and exports visually identical.
    let seed = 17
    g.fillStyle = light ? 'rgba(30,32,30,.045)' : 'rgba(255,255,255,.035)'
    for (let i = 0; i < 5500; i++) {
      seed = (seed * 16807) % 2147483647; const x = seed % W
      seed = (seed * 16807) % 2147483647; g.fillRect(x, seed % H, 1.5, 1.5)
    }
  }
  const trophy = (x: number, y: number, size = 64) => {
    g.save(); g.translate(x, y); g.scale(size / 64, size / 64); g.strokeStyle = C.orange; g.lineWidth = 3; g.lineJoin = 'round'
    const p = new Path2D('M16 5H48V22C48 47 16 47 16 22ZM16 10H5V20C5 33 15 36 21 36M48 10H59V20C59 33 49 36 43 36M32 41V55M20 59H44M25 55H39')
    g.stroke(p); g.restore()
  }
  const statIcon = (i: number, x: number, y: number) => {
    g.save(); g.translate(x, y); g.strokeStyle = C.text; g.lineWidth = 2.5; g.lineCap = 'round'; g.lineJoin = 'round'
    const paths = ['M20 2H36M28 2V9M45 10L49 14M28 18V32', 'M3 15V37M10 7V45M46 7V45M53 15V37M10 26H46', 'M7 18V43C7 53 49 53 49 43V18M7 30C7 40 49 40 49 30']
    g.stroke(new Path2D(paths[i])); g.beginPath()
    if (i === 0) g.arc(28, 32, 22, 0, Math.PI * 2)
    if (i === 2) g.ellipse(28, 18, 21, 7, 0, 0, Math.PI * 2)
    g.stroke(); g.restore()
  }
  const stats = (y: number, large = true) => {
    const data = [[s.minutes ? number(s.minutes) : '—', 'MIN', 'TOTAL TIME'], [number(s.sets), 'SETS', 'TOTAL SETS'], [number(s.volume), 'LB', 'TOTAL VOLUME']]
    const col = span / 3
    data.forEach(([value, unit, name], i) => {
      const x = M + i * col
      if (i) line(x, y, 2, C.orange, large ? 230 : 92)
      g.textAlign = 'center'
      if (large) statIcon(i, x + col / 2 - 28, y + 4)
      text(value, x + col / 2, y + (large ? 148 : 48), large ? 118 : 64, C.orange, 900, col - 30)
      text(unit, x + col / 2, y + (large ? 190 : 82), large ? 29 : 22, C.text, 800, col - 30)
      if (large) label(name, x + col / 2, y + 230, C.mute, col - 30)
      g.textAlign = 'left'
    })
  }
  const progress = (y: number, paper = false, includePr = false) => {
    const ink = paper ? C.ink : C.text, mute = paper ? '#646762' : C.mute
    const pct = s.volumeChangePct
    line(M, y - 20, span, paper ? '#b2b3a9' : C.line)
    if (pct !== null && Number.isFinite(pct)) {
      text(signed(pct), M, y + 42, 64, pct > 0 ? C.orange : ink, 900, 340)
      label('VOLUME VS LAST SESSION', M + 360, y + 10, mute, span - 360)
      text(title(s.title), M + 360, y + 48, 27, ink, 700, span - 360)
    } else {
      text('WORK PUT IN.', M, y + 32, 36, ink, 800)
      label('YOUR NEXT SESSION STARTS HERE.', M, y + 69, mute)
    }
    if (includePr && s.prs[0]) {
      const pr = s.prs[0]
      text(`NEW PR · ${pr.name} · +${number(pr.pct)}% EST. STRENGTH`, M, y + 104, 24, paper ? C.ink : C.orange, 700, span)
    }
  }
  const footer = (y: number, paper = false) => {
    const ink = paper ? '#646762' : C.mute
    line(M, y - 28, span, paper ? '#b2b3a9' : C.line)
    label('W I L L P O W E R', M, y + 16, paper ? C.ink : C.orange, 400)
    g.textAlign = 'right'; label(s.streak > 1 ? `${s.streak}-DAY STREAK` : 'SHOW UP. GO FURTHER.', R, y + 16, ink, 450); g.textAlign = 'left'
  }
  const metadata = (y: number, ink = C.mute) => {
    const date = new Date(`${s.date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    label(date.toUpperCase(), M, y, ink, s.place ? 380 : span)
    if (s.place) { g.textAlign = 'right'; label(s.place, R, y, ink, 490); g.textAlign = 'left' }
  }
  g.fillStyle = C.bg; g.fillRect(0, 0, W, H); texture()

  if (style === 'receipt') {
    const paperTop = top - 36, paperBottom = bottom + 32
    g.fillStyle = C.paper; g.beginPath(); g.moveTo(40, paperTop)
    for (let x = 40; x <= W - 40; x += 20) g.lineTo(x, paperTop + ((x * 13) % 17))
    g.lineTo(W - 40, paperBottom)
    for (let x = W - 40; x >= 40; x -= 20) g.lineTo(x, paperBottom - ((x * 7) % 13))
    g.closePath(); g.fill(); texture(true)
    brand(top + 36, C.ink)
    text('SESSION RECEIPT', M, top + 160, 92, C.orange, 900)
    text(title(s.title), M, top + 222, 34, C.ink, 800)
    metadata(top + 268, '#646762')
    const tableTop = top + 332, tableBottom = bottom - 360
    const cols = [M, 614, 772, R]
    label('EXERCISE', M, tableTop, C.ink, 440)
    g.textAlign = 'right'; label('SETS', cols[1], tableTop, C.ink, 90); label('TOP LB', cols[2], tableTop, C.ink, 135); label('VOLUME', R, tableTop, C.ink, 160); g.textAlign = 'left'
    const dash = (y: number) => { g.save(); g.setLineDash([9, 7]); g.strokeStyle = '#92968e'; g.lineWidth = 2; g.beginPath(); g.moveTo(M, y); g.lineTo(R, y); g.stroke(); g.restore() }
    dash(tableTop + 20)
    const details = s.exerciseDetails ?? [], rowHeight = 62, capacity = Math.max(1, Math.floor((tableBottom - tableTop - 38) / rowHeight))
    const visible = details.slice(0, details.length > capacity ? capacity - 1 : capacity)
    visible.forEach((e, i) => {
      const y = tableTop + 68 + i * rowHeight
      let name = e.name.toUpperCase(); g.font = `600 26px ${MONO}`
      while (name.length > 1 && g.measureText(name).width > 450) name = name.slice(0, -1)
      if (name !== e.name.toUpperCase()) name = name.slice(0, -1) + '…'
      text(name, M, y, 26, C.ink, 600, 450, true)
      g.textAlign = 'right'; text(number(e.sets), cols[1], y, 26, C.ink, 600, 90, true); text(number(e.weight), cols[2], y, 26, C.ink, 600, 135, true); text(number(e.volume), R, y, 26, C.ink, 600, 160, true); g.textAlign = 'left'
    })
    if (visible.length < details.length) label(`+ ${details.length - visible.length} MORE EXERCISES · TOTALS INCLUDE ALL`, M, tableTop + 68 + visible.length * rowHeight, '#646762')
    if (!details.length) label(`${s.exercises} EXERCISES COMPLETED`, M, tableTop + 80, '#646762')
    dash(tableBottom + 10)
    label('TOTAL SETS / TIME', M, bottom - 304, C.ink)
    g.textAlign = 'right'; text(`${s.sets} / ${s.minutes ? number(s.minutes) + ' MIN' : '—'}`, R, bottom - 304, 29, C.ink, 700, 460, true); g.textAlign = 'left'
    text('TOTAL VOLUME', M, bottom - 245, 30, C.ink, 900, 450)
    g.textAlign = 'right'; text(`${number(s.volume)} LB`, R, bottom - 240, 52, C.ink, 900, 450); g.textAlign = 'left'
    progress(bottom - 174, true, true); footer(bottom - 12, true)
  } else if (style === 'photo') {
    if (options.photo?.width && options.photo.height) {
      const photo = options.photo, scale = Math.max(W / photo.width, H / photo.height)
      g.drawImage(photo, (W - photo.width * scale) / 2, (H - photo.height * scale) / 2, photo.width * scale, photo.height * scale)
    } else {
      const gradient = g.createLinearGradient(0, 0, W, H); gradient.addColorStop(0, '#343e41'); gradient.addColorStop(1, '#131618'); g.fillStyle = gradient; g.fillRect(0, 0, W, H)
      g.save(); g.strokeStyle = '#667274'; g.lineWidth = 4; g.strokeRect(W / 2 - 75, H * .3 - 50, 150, 110); g.beginPath(); g.arc(W / 2, H * .3 + 5, 30, 0, Math.PI * 2); g.stroke(); g.restore()
      g.textAlign = 'center'; label('ADD YOUR WORKOUT PHOTO', W / 2, H * .3 + 115, C.text); g.textAlign = 'left'
    }
    const shade = g.createLinearGradient(0, 0, 0, H); shade.addColorStop(0, 'rgba(0,0,0,.55)'); shade.addColorStop(.34, 'rgba(0,0,0,.05)'); shade.addColorStop(.62, 'rgba(0,0,0,.65)'); shade.addColorStop(1, '#090c0d'); g.fillStyle = shade; g.fillRect(0, 0, W, H)
    brand(top + 20)
    label(title(s.title), M, bottom - 620, C.orange)
    wrap('WORK PUT IN.', M, bottom - 390, 184, span, C.text, 1)
    line(M, bottom - 280, span, C.orange, 4)
    stats(bottom - 252, false)
    progress(bottom - 110, false, true); footer(bottom + 40)
  } else if (style === 'pr') {
    const pr = s.prs[0]
    if (!pr) throw new Error('A PR poster needs a personal record from this workout.')
    g.save(); g.globalAlpha = .17; g.fillStyle = C.orange; g.beginPath(); g.moveTo(820, 0); g.lineTo(1080, 0); g.lineTo(260, H); g.lineTo(0, H); g.closePath(); g.fill(); g.restore()
    brand(top + 20); metadata(top + 94)
    text(`${number(pr.weight)} LB`, M - 8, top + area * .32, 260, C.orange, 900)
    wrap(pr.name.toUpperCase(), M, top + area * .43, 108, span, C.text, 2)
    const center = top + area * .61
    trophy(W / 2 - 36, center - 54, 72)
    line(M, center - 12, 300, C.orange); line(R - 300, center - 12, 300, C.orange)
    g.textAlign = 'center'; text('NEW PERSONAL BEST', W / 2, center + 68, 34, C.text, 800); label(`${number(pr.weight)} LB × ${pr.reps} REPS · EST. 1RM ${number(Math.round(pr.e1 * 10) / 10)} LB`, W / 2, center + 112); g.textAlign = 'left'
    const comparison = top + area * .79
    g.fillStyle = '#171c1e'; g.fillRect(M, comparison - 40, span, 144)
    label('PREVIOUS EST. 1RM', M + 28, comparison, C.mute, 420)
    text(`${number(Math.round(previousBest(pr) * 10) / 10)} LB`, M + 28, comparison + 66, 60, C.text, 800, 400)
    line(W / 2, comparison - 12, 2, C.line, 90)
    text(`+${number(pr.pct)}%`, W / 2 + 36, comparison + 30, 78, C.orange, 900, 380)
    label('EST. STRENGTH GAIN', W / 2 + 36, comparison + 72, C.mute, 380)
    footer(bottom + 18)
  } else {
    brand(top + 20); metadata(top + 108); line(M, top + 145, span)
    g.font = `900 230px ${DISPLAY}`
    const titleSize = g.measureText(title(s.title)).width <= span ? 230 : Math.min(180, area * .13)
    wrap(title(s.title), M - 6, top + area * .29, titleSize, span, C.text, 2)
    label('STRENGTH   /   CONSISTENCY   /   PROGRESS', M, top + area * .44)
    line(M, top + area * .48, span)
    stats(top + area * .52)
    progress(top + area * .79)
    if (s.prs[0]) { const pr = s.prs[0]; text(`NEW PR  ·  ${pr.name}  +${number(pr.pct)}%`, M, bottom - 52, 28, C.orange, 700, span) }
    footer(bottom + 18)
  }
  return new Promise((resolve, reject) => cv.toBlob((blob) => {
    cv.width = cv.height = 1
    if (blob) resolve(blob); else reject(new Error('Could not make your workout card.'))
  }, 'image/png'))
}
