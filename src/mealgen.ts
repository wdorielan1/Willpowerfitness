import type { FoodItem } from './types'

export interface Macro { p: number; c: number; f: number }
export interface Pick { item: FoodItem; qty: number }

/** Finds how many servings of each chosen food get closest to a macro target (non-negative, rounded to quarter servings). */
export function solveMeal(foods: FoodItem[], t: Macro): Pick[] {
  if (!foods.length) return []
  const w = { p: 1.3, c: 1, f: 0.6 }
  const x = foods.map(() => 0.5)
  const err = () => {
    const s = { p: -t.p, c: -t.c, f: -t.f }
    foods.forEach((f, i) => { s.p += f.p * x[i]; s.c += f.c * x[i]; s.f += f.f * x[i] })
    return s
  }
  for (let it = 0; it < 400; it++) {
    foods.forEach((f, i) => {
      const e = err()
      const num = w.p * f.p * e.p + w.c * f.c * e.c + w.f * f.f * e.f
      const den = w.p * f.p * f.p + w.c * f.c * f.c + w.f * f.f * f.f
      if (den > 0) x[i] = Math.min(8, Math.max(0, x[i] - num / den))
    })
  }
  return foods.map((item, i) => ({ item, qty: Math.round(x[i] * 4) / 4 })).filter((p) => p.qty > 0)
}

export const sumPicks = (l: Pick[]) => l.reduce((a, { item, qty }) => ({ cal: a.cal + item.cal * qty, p: a.p + item.p * qty, c: a.c + item.c * qty, f: a.f + item.f * qty }), { cal: 0, p: 0, c: 0, f: 0 })
