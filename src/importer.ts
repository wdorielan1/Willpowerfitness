import { EXERCISES } from './data'
import { addDays, iso, todayISO } from './engine'
import type { DayType, LogEntry, WorkoutLog } from './types'

const ALIASES: Record<string, string> = {
  'bench': 'bench', 'bench press': 'bench', 'flat bench': 'bench', 'barbell bench': 'bench',
  'incline press': 'incdb', 'incline dumbbell press': 'incdb', 'incline db press': 'incdb', 'incline bench': 'incdb',
  'chest press': 'chestmach', 'machine chest press': 'chestmach', 'cable fly': 'cablefly', 'cable flys': 'cablefly', 'pec fly': 'cablefly',
  'pushdown': 'pushdown', 'tricep pushdown': 'pushdown', 'triceps pushdown': 'pushdown', 'rope pushdown': 'pushdown',
  'overhead tricep extension': 'ohtri', 'overhead triceps extension': 'ohtri', 'skull crusher': 'ohtri',
  'lateral raise': 'latraise', 'lateral raises': 'latraise', 'side raise': 'latraise', 'side lateral raise': 'latraise',
  'row': 'row', 'barbell row': 'row', 'bent over row': 'row', 'pendlay row': 'row',
  'lat pulldown': 'pulldown', 'pulldown': 'pulldown', 'pulldowns': 'pulldown', 'lat pull down': 'pulldown',
  'one arm dumbbell row': 'dbrow', 'dumbbell row': 'dbrow', 'db row': 'dbrow', 'single arm row': 'dbrow',
  'seated cable row': 'cablerow', 'cable row': 'cablerow', 'seated row': 'cablerow', 'chest supported row': 'csrow', 'pull up': 'pullup', 'pullup': 'pullup', 'pull ups': 'pullup', 'chin up': 'pullup',
  'face pull': 'facepull', 'face pulls': 'facepull', 'curl': 'dbcurl', 'bicep curl': 'dbcurl', 'dumbbell curl': 'dbcurl', 'db curl': 'dbcurl', 'barbell curl': 'dbcurl',
  'hammer curl': 'hammer', 'hammer curls': 'hammer',
  'squat': 'squat', 'back squat': 'squat', 'barbell squat': 'squat', 'goblet squat': 'goblet',
  'romanian deadlift': 'rdl', 'rdl': 'rdl', 'stiff leg deadlift': 'rdl', 'leg press': 'legpress', 'lunge': 'lunge', 'lunges': 'lunge', 'walking lunge': 'lunge',
  'leg curl': 'legcurl', 'hamstring curl': 'legcurl', 'leg extension': 'legext', 'calf raise': 'calf', 'calf raises': 'calf', 'standing calf raise': 'calf',
  'shoulder press': 'dbpress', 'dumbbell shoulder press': 'dbpress', 'overhead press': 'dbpress', 'military press': 'dbpress', 'ohp': 'dbpress',
  'rear delt fly': 'reardelt', 'rear delt': 'reardelt', 'reverse fly': 'reardelt', 'shrug': 'shrug', 'shrugs': 'shrug',
  'cable crunch': 'cablecrunch', 'crunch': 'cablecrunch', 'hanging leg raise': 'legraise', 'leg raise': 'legraise', 'plank': 'plank',
  'deadlift': 'deadlift', 'conventional deadlift': 'deadlift', 'push up': 'pushup', 'pushup': 'pushup', 'push ups': 'pushup',
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
const slug = (s: string) => norm(s).replace(/ /g, '-')

export function matchExercise(raw: string): { id: string; name: string; day: DayType | null; matched: boolean } {
  const n = norm(raw)
  const direct = ALIASES[n] ?? ALIASES[n.replace(/s$/, '')]
  if (direct) {
    const ex = EXERCISES.find((x) => x.id === direct)!
    return { id: ex.id, name: ex.name, day: ex.day, matched: true }
  }
  const byName = EXERCISES.find((x) => norm(x.name) === n)
  if (byName) return { id: byName.id, name: byName.name, day: byName.day, matched: true }
  // token overlap
  const toks = new Set(n.split(' ').filter((t) => t.length > 2))
  let best: { ex: (typeof EXERCISES)[number]; score: number } | null = null
  for (const ex of EXERCISES) {
    const et = norm(ex.name).split(' ').filter((t) => t.length > 2)
    const hit = et.filter((t) => toks.has(t)).length
    const score = hit / Math.max(et.length, toks.size || 1)
    if (hit && (!best || score > best.score)) best = { ex, score }
  }
  if (best && best.score >= 0.6) return { id: best.ex.id, name: best.ex.name, day: best.ex.day, matched: true }
  const name = raw.trim().replace(/\s+/g, ' ')
  return { id: `x:${slug(raw)}`, name: name.charAt(0).toUpperCase() + name.slice(1), day: null, matched: false }
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

export function parseDate(s: string, fallbackYear = new Date().getFullYear()): string | null {
  const t = s.trim()
  let m = t.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/)
  if (m) return iso(new Date(+m[1], +m[2] - 1, +m[3]))
  m = t.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/)
  if (m) return iso(new Date(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[1] - 1, +m[2]))
  m = t.match(/^(?:[a-z]+,?\s+)?([a-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?$/i)
  if (m) {
    const mi = MONTHS.indexOf(m[1].slice(0, 3).toLowerCase())
    if (mi >= 0) return iso(new Date(m[3] ? +m[3] : fallbackYear, mi, +m[2]))
  }
  m = t.match(/^(\d{1,2})[/.-](\d{1,2})$/)
  if (m) return iso(new Date(fallbackYear, +m[1] - 1, +m[2]))
  return null
}

interface RawSet { weight: number; reps: number; rpe?: number }

function parseSets(text: string, kgToLb: boolean): RawSet[] {
  const k = kgToLb ? 2.20462 : 1
  const out: RawSet[] = []
  const w = (n: string) => Math.round(parseFloat(n) * k * 10) / 10
  // 185 x 8 x 3  (weight x reps x sets)
  const three = [...text.matchAll(/(\d+(?:\.\d+)?)\s*(?:lbs?|kg)?\s*[x×]\s*(\d+)\s*[x×]\s*(\d+)/gi)]
  if (three.length) {
    for (const m of three) for (let i = 0; i < Math.min(+m[3], 12); i++) out.push({ weight: w(m[1]), reps: +m[2] })
    return out
  }
  // 3x8 @ 185
  const at = [...text.matchAll(/(\d+)\s*[x×]\s*(\d+)\s*(?:@|at|with)\s*(\d+(?:\.\d+)?)/gi)]
  if (at.length) {
    for (const m of at) for (let i = 0; i < Math.min(+m[1], 12); i++) out.push({ weight: w(m[3]), reps: +m[2] })
    return out
  }
  // 185x8, 185x8
  for (const m of text.matchAll(/(\d+(?:\.\d+)?)\s*(?:lbs?|kg)?\s*[x×]\s*(\d+)/gi)) out.push({ weight: w(m[1]), reps: +m[2] })
  return out
}

export interface ImportResult {
  logs: WorkoutLog[]
  setCount: number
  exercises: { name: string; matched: boolean; sets: number }[]
  skipped: string[]
}

export function parseHistory(text: string, opts: { kg: boolean; undatedDate?: string }): ImportResult {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const byDate = new Map<string, Map<string, LogEntry & { day: DayType | null }>>()
  const skipped: string[] = []
  const undated = opts.undatedDate ?? addDays(todayISO(), -1)
  let currentDate: string | null = null

  const add = (date: string, rawName: string, sets: RawSet[]) => {
    if (!sets.length) return
    const ex = matchExercise(rawName)
    const day = byDate.get(date) ?? new Map()
    const cur = day.get(ex.id) ?? { exId: ex.id, name: ex.name, sets: [], note: '', day: ex.day }
    cur.sets.push(...sets)
    day.set(ex.id, cur)
    byDate.set(date, day)
  }

  // CSV mode: header contains "exercise"
  const header = lines[0]?.toLowerCase() ?? ''
  if (/exercise/.test(header) && /[,\t;]/.test(header)) {
    const sep = header.includes('\t') ? '\t' : header.includes(';') ? ';' : ','
    const cols = lines[0].split(sep).map((c) => c.trim().toLowerCase())
    const ix = (n: string[]) => cols.findIndex((c) => n.some((x) => c.includes(x)))
    const iD = ix(['date']), iE = ix(['exercise']), iW = ix(['weight', 'lb', 'kg']), iR = ix(['rep']), iS = ix(['set']), iP = ix(['rpe'])
    for (const line of lines.slice(1)) {
      const c = line.split(sep).map((x) => x.trim().replace(/^"|"$/g, ''))
      const date = (iD >= 0 && parseDate(c[iD] ?? '')) || undated
      const weight = parseFloat(c[iW] ?? '')
      const reps = parseInt(c[iR] ?? '', 10)
      const nSets = iS >= 0 ? Math.max(1, Math.min(12, parseInt(c[iS] ?? '1', 10) || 1)) : 1
      if (!c[iE] || !(weight >= 0) || !(reps > 0)) { skipped.push(line); continue }
      const rpe = iP >= 0 ? parseFloat(c[iP] ?? '') : NaN
      const wl = Math.round(weight * (opts.kg ? 2.20462 : 1) * 10) / 10
      add(date, c[iE], Array.from({ length: nSets }, () => ({ weight: wl, reps, rpe: rpe > 0 ? rpe : undefined })))
    }
  } else {
    for (const line of lines) {
      const asDate = parseDate(line.replace(/[:\-–]+$/, '').replace(/^#+\s*/, ''))
      if (asDate) { currentDate = asDate; continue }
      // "2025-03-04 Bench Press 185x8" style: date at the start of the line
      let body = line
      const lead = line.match(/^(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4})[\s,:-]+(.*)$/)
      let date = currentDate ?? undated
      if (lead) { date = parseDate(lead[1]) ?? date; body = lead[2] }
      const nameEnd = body.search(/[:\d]/)
      const rawName = (nameEnd > 0 ? body.slice(0, nameEnd) : '').replace(/^[-*•\s]+/, '').replace(/[-–@]+$/, '').trim()
      const sets = parseSets(body.slice(nameEnd > 0 ? nameEnd : 0), opts.kg)
      if (rawName && sets.length) add(date, rawName, sets)
      else skipped.push(line)
    }
  }

  const logs: WorkoutLog[] = []
  const ex: Record<string, { name: string; matched: boolean; sets: number }> = {}
  let setCount = 0
  for (const [date, map] of byDate) {
    const entries = [...map.values()]
    const tally: Record<string, number> = {}
    entries.forEach((e) => { if (e.day) tally[e.day] = (tally[e.day] ?? 0) + 1 })
    const top = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]
    const dayType = (top && top[1] >= Math.ceil(entries.length / 2) ? top[0] : 'Full Body') as DayType
    logs.push({ date, dayType, short: false, imported: true, entries: entries.map(({ day: _d, ...rest }) => { void _d; return rest }) })
    for (const e of entries) {
      setCount += e.sets.length
      const m = (ex[e.exId] ??= { name: e.name, matched: !e.exId.startsWith('x:'), sets: 0 })
      m.sets += e.sets.length
    }
  }
  logs.sort((a, b) => a.date.localeCompare(b.date))
  return { logs, setCount, exercises: Object.values(ex).sort((a, b) => b.sets - a.sets), skipped }
}

/** Merge imported logs into existing ones (same date: append exercises that aren't already logged). */
export function mergeLogs(existing: WorkoutLog[], incoming: WorkoutLog[]): WorkoutLog[] {
  const map = new Map(existing.map((l) => [l.date, l]))
  for (const inc of incoming) {
    const cur = map.get(inc.date)
    if (!cur) { map.set(inc.date, inc); continue }
    const have = new Set(cur.entries.map((e) => e.exId))
    map.set(inc.date, { ...cur, entries: [...cur.entries, ...inc.entries.filter((e) => !have.has(e.exId))] })
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date))
}

export const CHATGPT_PROMPT = `Look through my workout history and export ALL of it as a CSV with exactly these columns:
date,exercise,weight,reps,sets
- date as YYYY-MM-DD
- one row per exercise per date (if sets differed, use one row per distinct weight/reps)
- weight in pounds (number only)
- no extra commentary, just the CSV inside one code block.
If you do not have exact dates, give your best estimate and say which ones are estimated.`
