import { IDENTITIES, type CommunityDef } from './data'
import { fmtTime } from './engine'
import type { Profile } from './types'

export interface Suggestion { crew: CommunityDef; score: number; reasons: string[] }

const mins = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }

/** Rank crews by how well they fit what the user told us. Higher is a better fit. */
export function suggestCrews(p: Profile, all: CommunityDef[]): Suggestion[] {
  const out: Suggestion[] = []
  for (const c of all) {
    let score = 0
    const reasons: string[] = []
    const diff = Math.abs(mins(p.time) - mins(c.time))
    if (diff <= 45) { score += 4; reasons.push(`Trains at ${fmtTime(c.time)}, near your time`) }
    else if (diff <= 120) { score += 2; reasons.push(`Trains at ${fmtTime(c.time)}`) }
    for (const id of c.tags ?? []) {
      if (p.identities?.includes(id)) { score += 5; reasons.push(IDENTITIES.find((x) => x.id === id)?.reason ?? 'Fits you') }
    }
    if (p.age && c.ages?.includes(p.age)) { score += 4; reasons.push(`Your age group (${p.age})`) }
    if (c.goals?.includes(p.goal)) { score += 3; reasons.push('Matches your goal') }
    if (c.level && c.level === p.level) { score += 3; reasons.push('Made for your experience level') }
    if (p.vibe && c.vibes?.includes(p.vibe)) { score += 2; reasons.push('Your kind of vibe') }
    if (score > 0) out.push({ crew: c, score: score + c.members / 10000, reasons: [...new Set(reasons)].slice(0, 3) })
  }
  return out.sort((a, b) => b.score - a.score)
}
