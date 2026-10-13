import type { FoodItem } from './types'

export const CHATGPT_FOOD_PROMPT = `Look through the foods and meals I eat regularly (my food log, what I've told you I eat, or the list I'm giving you below) and export them as a CSV with exactly these columns:
name,serving,calories,protein,carbs,fat
- one row per food or meal I eat often (a whole meal like "Chicken rice bowl" counts as one row)
- serving = the amount the numbers are for, like "1 bowl", "4 oz" or "2 eggs"
- calories in kcal, protein / carbs / fat in grams (numbers only)
- no extra commentary, just the CSV inside one code block.
Use real numbers from labels or the data I gave you when they exist. If you have to estimate, give your best estimate and add "(est.)" to the end of the name. Do not invent foods I haven't mentioned.`

export interface FoodImportResult {
  foods: FoodItem[]
  skipped: string[]
  /** rows that were already in My foods, or listed twice */
  duplicates: number
}

/** Split one CSV line, keeping commas that sit inside quotes. */
function splitLine(line: string): string[] {
  if (line.includes('|')) return line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim())
  const out: string[] = []
  let cur = '', quoted = false
  for (const ch of line) {
    if (ch === '"') { quoted = !quoted; continue }
    if ((ch === ',' || ch === '\t' || ch === ';') && !quoted) { out.push(cur.trim()); cur = ''; continue }
    cur += ch
  }
  out.push(cur.trim())
  return out
}

const num = (s: string | undefined): number | null => {
  if (s === undefined) return null
  const m = s.replace(/,(?=\d{3}\b)/g, '').match(/-?\d+(?:\.\d+)?/)
  return m ? parseFloat(m[0]) : null
}
const key = (name: string, serving: string) => `${name.toLowerCase().replace(/\s+/g, ' ').trim()}|${serving.toLowerCase().replace(/\s+/g, ' ').trim()}`

type Col = 'name' | 'serving' | 'cal' | 'p' | 'c' | 'f'
const HEADER: [Col, RegExp][] = [
  ['name', /^(name|food|meal|item|description)$/i],
  ['serving', /^(serving|portion|amount|size|quantity|serving size)/i],
  ['cal', /^(cal|kcal|calories|energy)/i],
  ['p', /^(p|protein|prot)/i],
  ['c', /^(c|carbs?|carbohydrates?)/i],
  ['f', /^(f|fats?)\b|^fat/i],
]

/** Read foods from a CSV, a markdown table, or plain comma lines. Works with or without a header row. */
export function parseFoods(text: string, existing: FoodItem[] = []): FoodImportResult {
  const lines = text.replace(/```[a-z]*/gi, '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    .filter((l) => !/^\|?\s*:?-{2,}/.test(l)) // markdown divider row
  const seen = new Set(existing.map((f) => key(f.name, f.serving)))
  const foods: FoodItem[] = []
  const skipped: string[] = []
  let duplicates = 0
  let order: Col[] | null = null
  const stamp = Date.now()

  for (const line of lines) {
    const cells = splitLine(line)
    // a header row names the columns instead of holding numbers
    const named = cells.map((c) => HEADER.find(([, re]) => re.test(c.replace(/\(.*?\)/g, '').trim()))?.[0] ?? null)
    if (named.filter(Boolean).length >= 3 && cells.every((c) => num(c) === null || /^(p|c|f)$/i.test(c))) { order = named.map((n, i) => n ?? (['name', 'serving', 'cal', 'p', 'c', 'f'] as Col[])[i]); continue }
    const cols: Col[] = order ?? (cells.length >= 6 ? ['name', 'serving', 'cal', 'p', 'c', 'f'] : cells.length === 5 ? ['name', 'cal', 'p', 'c', 'f'] : ['name', 'serving', 'cal', 'p', 'c', 'f'])
    const get = (c: Col) => { const i = cols.indexOf(c); return i >= 0 ? cells[i] : undefined }
    const name = (get('name') ?? '').replace(/\s+/g, ' ').trim()
    const p = num(get('p')), c = num(get('c')), f = num(get('f'))
    let cal = num(get('cal'))
    if (!name || name.length > 80 || (p === null && c === null && f === null && cal === null)) { skipped.push(line); continue }
    const pp = Math.max(0, p ?? 0), cc = Math.max(0, c ?? 0), ff = Math.max(0, f ?? 0)
    if (cal === null || cal <= 0) cal = pp * 4 + cc * 4 + ff * 9
    if (cal > 5000 || pp > 500 || cc > 800 || ff > 500) { skipped.push(line); continue }
    const serving = (get('serving') ?? '').trim() || '1 serving'
    const k = key(name, serving)
    if (seen.has(k)) { duplicates++; continue }
    seen.add(k)
    foods.push({ id: `mine-${stamp}-${foods.length}`, name, serving, cal: Math.round(cal), p: Math.round(pp * 10) / 10, c: Math.round(cc * 10) / 10, f: Math.round(ff * 10) / 10, cat: 'My foods' })
  }
  return { foods, skipped, duplicates }
}
