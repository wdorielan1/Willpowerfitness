import { DAY_NAMES, GOALS, LEVELS } from './data'
import { addDays, e1rm, macroPlan, streak, todayISO } from './engine'
import type { AppData } from './types'

export interface ExportOpts { profile: boolean; workouts: boolean; strength: boolean; body: boolean; cardio: boolean; nutrition: boolean; weeks: number }
export const DEFAULT_EXPORT: ExportOpts = { profile: true, workouts: true, strength: true, body: true, cardio: true, nutrition: true, weeks: 8 }

export const AI_PROMPT = `You are an experienced strength and conditioning coach. Below is my training data from the Will Power app. Please:
1. Tell me what is going well and what is not.
2. Spot trends in my strength, consistency, body weight, cardio and nutrition.
3. Tell me what to change over the next 2 weeks (exercises, sets, reps, load, rest, nutrition).
4. Point out anything that looks like a risk for overtraining or injury.
5. Ask me any questions you need answered to coach me better.
Be specific and use my numbers. I am not looking for medical advice.

--- MY DATA ---
`

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
const r1 = (n: number) => Math.round(n * 10) / 10

/** A readable summary (markdown) of the selected sections. Never includes your name, email or photos. */
export function buildSummary(d: AppData, o: ExportOpts, today = todayISO()): string {
  const from = addDays(today, -7 * o.weeks)
  const p = d.profile
  const logs = d.logs.filter((l) => !l.baseline && !l.skipped && l.date >= from && l.date <= today).sort((a, b) => a.date.localeCompare(b.date))
  const out: string[] = [`# Training summary (last ${o.weeks} weeks, to ${today})`]

  if (o.profile && p) {
    out.push('\n## Profile', `- Goal: ${GOALS[p.goal]} · Experience: ${LEVELS[p.level]} · Style: ${p.style}`, `- Training days: ${p.days.map((x) => DAY_NAMES[x]).join(', ')} · Equipment: ${{ gym: 'full gym', db: 'dumbbells', bw: 'bodyweight' }[p.gear]}`,
      `- Body weight: ${p.weight} lb → target ${p.target} lb`, p.avoid ? `- Avoiding: ${p.avoid}` : '', p.age ? `- Age group: ${p.age}` : '')
  }

  if (o.workouts) {
    const weeksN = o.weeks
    const perWeek: number[] = []
    for (let w = weeksN - 1; w >= 0; w--) {
      const end = addDays(today, -7 * w), start = addDays(end, -6)
      perWeek.push(Object.entries(d.checkins).filter(([k, v]) => k >= start && k <= end && v.done).length)
    }
    const planned = p?.days.length ?? 0
    out.push('\n## Consistency', `- Workouts per week (oldest to newest): ${perWeek.join(', ')} (plan: ${planned}/week)`, `- Current streak: ${streak(d)} days · Total in period: ${perWeek.reduce((a, b) => a + b, 0)}`)
    const skipped = d.logs.filter((l) => l.skipped && l.date >= from).length
    if (skipped) out.push(`- Workouts skipped on purpose: ${skipped}`)
    out.push('\n## Recent sessions')
    for (const l of logs.slice(-12)) {
      const sets = l.entries.reduce((a, e) => a + e.sets.length, 0)
      out.push(`- ${l.date} ${l.dayType}${l.minutes ? `, ${l.minutes} min` : ''}: ` + l.entries.map((e) => `${e.name} ${e.sets.map((s) => `${s.weight}x${s.reps}${s.rpe ? `@${s.rpe}` : ''}`).join(' ')}`).join('; ') + ` (${sets} sets)`)
    }
  }

  if (o.strength) {
    const byEx = new Map<string, { name: string; pts: { date: string; top: number; e1: number }[] }>()
    for (const l of logs) for (const e of l.entries) {
      if (!e.sets.length) continue
      const best = e.sets.reduce((b, s) => (e1rm(s.weight, s.reps) > e1rm(b.weight, b.reps) ? s : b))
      const row = byEx.get(e.exId) ?? { name: e.name, pts: [] }
      row.pts.push({ date: l.date, top: best.weight, e1: e1rm(best.weight, best.reps) })
      byEx.set(e.exId, row)
    }
    const lifts = [...byEx.values()].filter((x) => x.pts.length >= 2).sort((a, b) => b.pts.length - a.pts.length).slice(0, 10)
    out.push('\n## Strength trends (estimated 1RM)')
    if (!lifts.length) out.push('- Not enough repeated lifts yet.')
    for (const x of lifts) {
      const f = x.pts[0], l = x.pts[x.pts.length - 1]
      out.push(`- ${x.name}: ${f.e1} → ${l.e1} lb est. 1RM (${l.e1 - f.e1 >= 0 ? '+' : ''}${l.e1 - f.e1}) over ${x.pts.length} sessions · latest top set ${l.top} lb`)
    }
    const rpes = logs.flatMap((l) => l.entries.flatMap((e) => e.sets.map((s) => s.rpe).filter((r): r is number => !!r)))
    if (rpes.length) out.push(`- Average reported RPE (last set of lifts): ${r1(avg(rpes))}`)
  }

  if (o.body) {
    const w = [...d.weights].filter((x) => x.date >= from).sort((a, b) => a.date.localeCompare(b.date))
    out.push('\n## Body weight')
    if (w.length < 1) out.push('- No weigh-ins in this period.')
    else out.push(`- ${w.length} weigh-ins: ${w.slice(-14).map((x) => `${x.date.slice(5)} ${x.lbs}`).join(', ')}`, w.length > 1 ? `- Change: ${r1(w[w.length - 1].lbs - w[0].lbs)} lb` : '')
  }

  if (o.cardio) {
    const c = d.cardio.filter((x) => x.date >= from)
    const st = d.steps.filter((x) => x.date >= from)
    out.push('\n## Cardio and activity', `- Cardio sessions: ${c.length} · total ${c.reduce((a, x) => a + x.minutes, 0)} min · types: ${[...new Set(c.map((x) => x.kind))].join(', ') || 'none'}`)
    if (st.length) out.push(`- Steps logged on ${st.length} days · average ${Math.round(avg(st.map((x) => x.steps))).toLocaleString()}/day`)
  }

  if (o.nutrition && p) {
    const plan = macroPlan(p, d.settings.nutrition).medium
    out.push('\n## Nutrition', `- Targets (medium carb day): ${plan.cal} kcal · ${plan.p}g protein · ${plan.c}g carbs · ${plan.f}g fat · ${d.settings.nutrition.meals} meals/day`)
    const days = Object.entries(d.foodLog).filter(([k, v]) => k >= from && v.length)
    if (days.length) {
      const t = days.map(([, v]) => v.reduce((a, e) => ({ cal: a.cal + e.cal, p: a.p + e.p, c: a.c + e.c, f: a.f + e.f }), { cal: 0, p: 0, c: 0, f: 0 }))
      out.push(`- Logged ${days.length} days · average ${Math.round(avg(t.map((x) => x.cal)))} kcal · ${Math.round(avg(t.map((x) => x.p)))}P / ${Math.round(avg(t.map((x) => x.c)))}C / ${Math.round(avg(t.map((x) => x.f)))}F`)
    } else out.push('- No food logged in this period.')
  }
  return out.filter((l) => l !== '').join('\n')
}

export function buildCSV(d: AppData): string {
  const rows = ['date,workout,exercise,set,weight_lb,reps,rpe']
  for (const l of [...d.logs].filter((x) => !x.skipped).sort((a, b) => a.date.localeCompare(b.date))) {
    for (const e of l.entries) e.sets.forEach((s, i) => rows.push([l.date, l.dayType, `"${e.name.replace(/"/g, '""')}"`, i + 1, s.weight, s.reps, s.rpe ?? ''].join(',')))
  }
  return rows.join('\n')
}

/** Everything in your account except photos, name and email. */
export function buildJSON(d: AppData): string {
  const { posts: _p, photos: _ph, handle: _h, name: _n, drafts: _dr, ts: _t, messages: _m, ...rest } = d
  void _p; void _ph; void _h; void _n; void _dr; void _t; void _m
  return JSON.stringify(rest, null, 2)
}

export function download(filename: string, text: string, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
