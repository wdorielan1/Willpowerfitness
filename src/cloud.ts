import { createClient } from '@supabase/supabase-js'
import { useEffect, useState, useCallback } from 'react'
import { todayISO } from './engine'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase = url && key ? createClient(url, key, { auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true } }) : null
export const cloudEnabled = !!supabase

const first = (n: string) => (n || 'Member').trim().split(/\s+/)[0]

export interface LivePerson { name: string; status: 'done' | 'going'; streak: number; mine: boolean }
export interface LiveMsg { id: string; who: string; text: string; ts: number; mine: boolean }
export interface LiveCrew {
  members: number
  done: number
  going: number
  people: LivePerson[]
  board: { name: string; streak: number; mine: boolean }[]
  messages: LiveMsg[]
  refresh: () => void
}

/** Real crew data from Supabase. Returns null when the backend isn't configured. */
export function useLiveCrew(crewId: string | null, userId: string | null): LiveCrew | null {
  const [state, setState] = useState<Omit<LiveCrew, 'refresh'> | null>(null)
  const [tick, setTick] = useState(0)
  const refresh = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    if (!supabase || !crewId) return
    let alive = true
    const load = async () => {
      const day = todayISO()
      const [m, c, msg] = await Promise.all([
        supabase.from('crew_members').select('user_id,name,streak').eq('crew_id', crewId),
        supabase.from('crew_checkins').select('user_id,name,going,done').eq('crew_id', crewId).eq('day', day),
        supabase.from('crew_messages').select('id,user_id,name,text,created_at').eq('crew_id', crewId).order('created_at', { ascending: false }).limit(20),
      ])
      if (!alive) return
      const members = m.data ?? []
      const checks = c.data ?? []
      const streakOf = new Map(members.map((x) => [x.user_id as string, x.streak as number]))
      const people = checks
        .filter((x) => x.going || x.done)
        .map((x) => ({ name: first(x.name), status: (x.done ? 'done' : 'going') as 'done' | 'going', streak: streakOf.get(x.user_id) ?? 0, mine: x.user_id === userId }))
      setState({
        members: members.length,
        done: checks.filter((x) => x.done).length,
        going: checks.filter((x) => x.going && !x.done).length,
        people,
        board: members.map((x) => ({ name: first(x.name), streak: x.streak as number, mine: x.user_id === userId })).sort((a, b) => b.streak - a.streak).slice(0, 10),
        messages: (msg.data ?? []).map((x) => ({ id: String(x.id), who: first(x.name), text: x.text as string, ts: Date.parse(x.created_at as string), mine: x.user_id === userId })),
      })
    }
    void load()
    const id = setInterval(load, 20000)
    return () => { alive = false; clearInterval(id) }
  }, [crewId, userId, tick])

  if (!supabase) return null
  return { members: 0, done: 0, going: 0, people: [], board: [], messages: [], ...state, refresh }
}

export async function joinCrewCloud(crewId: string, userId: string, name: string, streak: number) {
  await supabase?.from('crew_members').upsert({ crew_id: crewId, user_id: userId, name, streak })
}
export async function leaveCrewCloud(crewId: string, userId: string) {
  await supabase?.from('crew_members').delete().eq('crew_id', crewId).eq('user_id', userId)
}
export async function pushCheckin(crewId: string, userId: string, name: string, c: { going: boolean; done: boolean }, streak: number) {
  if (!supabase) return
  await supabase.from('crew_checkins').upsert({ crew_id: crewId, user_id: userId, day: todayISO(), name, going: c.going, done: c.done, updated_at: new Date().toISOString() })
  await supabase.from('crew_members').update({ streak }).eq('crew_id', crewId).eq('user_id', userId)
}
export async function postMessageCloud(crewId: string, userId: string, name: string, text: string) {
  await supabase?.from('crew_messages').insert({ crew_id: crewId, user_id: userId, name, text })
}
export async function createCrewCloud(id: string, userId: string, name: string, time: string) {
  await supabase?.from('crews').insert({ id, name, time, created_by: userId })
}
export async function fetchCrews() {
  const r = await supabase?.from('crews').select('id,name,time,vibe')
  return (r?.data ?? []) as { id: string; name: string; time: string; vibe: string }[]
}

/** Member counts + today's completions for every crew (one pair of queries). */
export function useCrewCounts() {
  const [counts, setCounts] = useState<Record<string, { members: number; done: number }>>({})
  useEffect(() => {
    if (!supabase) return
    let alive = true
    const load = async () => {
      const [m, c] = await Promise.all([
        supabase.from('crew_members').select('crew_id'),
        supabase.from('crew_checkins').select('crew_id').eq('day', todayISO()).eq('done', true),
      ])
      if (!alive) return
      const out: Record<string, { members: number; done: number }> = {}
      for (const r of m.data ?? []) (out[r.crew_id as string] ??= { members: 0, done: 0 }).members++
      for (const r of c.data ?? []) (out[r.crew_id as string] ??= { members: 0, done: 0 }).done++
      setCounts(out)
    }
    void load()
    const id = setInterval(load, 30000)
    return () => { alive = false; clearInterval(id) }
  }, [])
  return counts
}
