import { useApp } from '../store'
import { COMMUNITIES, NAMES, type CommunityDef } from '../data'
import { fmtTime, groupStats, hash, todayISO } from '../engine'

export function allCommunities(custom: { id: string; name: string; time: string; vibe: string }[]): CommunityDef[] {
  return [
    ...COMMUNITIES,
    ...custom.map((c) => ({ id: c.id, name: c.name, time: c.time, members: 1, rate: 0.7, vibe: c.vibe, blurb: 'A crew you started. Invite your people.' })),
  ]
}

export function useCrew() {
  const { data } = useApp()
  const all = allCommunities(data.custom)
  return all.find((c) => c.id === data.primary) ?? null
}

/** Demo roster: deterministic per community + date. Replaced by real members once a backend exists. */
export function roster(c: CommunityDef, date = todayISO(), mine?: { name: string; going: boolean; done: boolean }) {
  const n = Math.min(7, Math.max(0, c.members - 1))
  const picks: { name: string; status: 'done' | 'going'; streak: number }[] = []
  const used = new Set<string>()
  for (let i = 0; i < n; i++) {
    const nm = NAMES[(hash(c.id + i) + i * 5) % NAMES.length]
    if (used.has(nm)) continue
    used.add(nm)
    picks.push({ name: nm, status: hash(c.id + date + nm) % 100 < c.rate * 70 ? 'done' : 'going', streak: 3 + (hash(nm + c.id) % 40) })
  }
  if (mine) picks.push({ name: `${mine.name} (you)`, status: mine.done ? 'done' : 'going', streak: 0 })
  return picks
}

export const stats = (c: CommunityDef, mineDone: boolean) => groupStats(c.id, c.rate, c.members, todayISO(), mineDone)
export const timeLabel = (c: CommunityDef) => fmtTime(c.time)
