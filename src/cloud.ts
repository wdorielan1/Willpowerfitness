import { createClient } from '@supabase/supabase-js'
import { useEffect, useState, useCallback } from 'react'
import type { CrewPost, CustomChallenge, PostKind } from './types'
import { todayISO } from './engine'
import { CREW_BUCKET, postPhotos, withRequestTimeout, withTimeout } from './photos'

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
  const { error } = (await supabase?.from('crew_members').upsert({ crew_id: crewId, user_id: userId, name, streak })) ?? {}
  return error?.message ?? null
}
/** Make sure the database knows you're in this crew, without touching an existing streak. Safe to call any time. */
export async function ensureMemberCloud(crewId: string, userId: string, name: string) {
  if (!supabase) return null
  const { error } = (await withRequestTimeout((signal) => supabase!.from('crew_members').upsert({ crew_id: crewId, user_id: userId, name, streak: 0 }, { onConflict: 'crew_id,user_id', ignoreDuplicates: true }).abortSignal(signal), 15000, 'Confirming crew membership')) ?? {}
  return error?.message ?? null
}
export async function leaveCrewCloud(crewId: string, userId: string) {
  if (!supabase) return
  const { error } = await withTimeout(supabase.from('crew_members').delete().eq('crew_id', crewId).eq('user_id', userId), 15000, 'Leaving crew')
  if (error) throw new Error(error.message)
}
export async function pushCheckin(crewId: string, userId: string, name: string, c: { going: boolean; done: boolean }, streak: number) {
  if (!supabase) return null
  try {
    const member = await withRequestTimeout((signal) => supabase!.from('crew_members').update({ streak }).eq('crew_id', crewId).eq('user_id', userId).abortSignal(signal), 15000, 'Updating crew streak')
    if (member.error) return member.error.message
    const checkin = await withRequestTimeout((signal) => supabase!.from('crew_checkins').upsert({ crew_id: crewId, user_id: userId, day: todayISO(), name, going: c.going, done: c.done, updated_at: new Date().toISOString() }).abortSignal(signal), 15000, 'Saving training check-in')
    return checkin.error?.message ?? null
  } catch (error) {
    return error instanceof Error ? error.message : 'Could not save your training check-in. Please try again.'
  }
}
export async function postMessageCloud(crewId: string, userId: string, name: string, text: string) {
  await supabase?.from('crew_messages').insert({ crew_id: crewId, user_id: userId, name, text })
}
export interface CrewPlace { place: string; lat: number; lng: number }
export async function createCrewCloud(id: string, userId: string, name: string, time: string, vibe = 'Time-based crew', cat = 'time', loc?: CrewPlace) {
  const base = { id, name, time, vibe, created_by: userId }
  const first = await supabase?.from('crews').insert({ ...base, cat, ...(loc ? { place: loc.place, lat: loc.lat, lng: loc.lng } : {}) })
  // Older databases do not have the newer columns yet: save the crew without them rather than losing it.
  if (first?.error) await supabase?.from('crews').insert(base)
}
export async function fetchCrews() {
  let r = await supabase?.from('crews').select('id,name,time,vibe,cat,place,lat,lng,created_at')
  if (r?.error) r = await supabase?.from('crews').select('id,name,time,vibe,created_at')
  type Row = { id: string; name: string; time: string; vibe: string; cat?: string; place?: string | null; lat?: number | null; lng?: number | null; created_at: string }
  return ((r?.data ?? []) as Row[]).map((x) => ({ id: x.id, name: x.name, time: x.time, vibe: x.vibe, cat: x.cat ?? 'time', place: x.place ?? undefined, lat: x.lat ?? undefined, lng: x.lng ?? undefined, created: Date.parse(x.created_at) }))
}

// ---------------- "I'd join a crew here" wait list and crew reports ----------------
export async function saveInterest(userId: string, lat: number, lng: number, place: string): Promise<string | null> {
  const { error } = (await supabase?.from('crew_interest').upsert({ user_id: userId, lat, lng, place })) ?? {}
  return error ? error.message : null
}
export async function interestNear(lat: number, lng: number, km = 40): Promise<number | null> {
  const { data, error } = (await supabase?.rpc('interest_near', { p_lat: lat, p_lng: lng, p_km: km })) ?? {}
  return error || typeof data !== 'number' ? null : data
}
export async function reportCrew(crewId: string, userId: string, reason: string): Promise<string | null> {
  const { error } = (await supabase?.from('crew_reports').insert({ crew_id: crewId, user_id: userId, reason: reason.slice(0, 500) })) ?? {}
  return error ? error.message : null
}

export const INACTIVE_DAYS = 35

export interface CrewCount { members: number; done: number; active: number; lastActive: number | null }

/** Member counts, today's completions and real activity for every crew (a few light queries).
 *  "active" = people who checked in or posted in the last 35 days. Nothing is inflated. */
export function useCrewCounts() {
  const [counts, setCounts] = useState<Record<string, CrewCount>>({})
  useEffect(() => {
    if (!supabase) return
    let alive = true
    const load = async () => {
      const cutoff = new Date(Date.now() - INACTIVE_DAYS * 86400000).toISOString()
      const [m, c, a, p] = await Promise.all([
        supabase.from('crew_members').select('crew_id'),
        supabase.from('crew_checkins').select('crew_id').eq('day', todayISO()).eq('done', true),
        supabase.from('crew_checkins').select('crew_id,user_id,updated_at').gte('updated_at', cutoff),
        supabase.from('crew_posts').select('crew_id,user_id,created_at').gte('created_at', cutoff),
      ])
      if (!alive) return
      const out: Record<string, CrewCount> = {}
      const get = (id: string) => (out[id] ??= { members: 0, done: 0, active: 0, lastActive: null })
      for (const r of m.data ?? []) get(r.crew_id as string).members++
      for (const r of c.data ?? []) get(r.crew_id as string).done++
      const people: Record<string, Set<string>> = {}
      const seen = (crew: string, user: string, at: string) => {
        const row = get(crew); const ts = Date.parse(at)
        ;(people[crew] ??= new Set()).add(user)
        if (!row.lastActive || ts > row.lastActive) row.lastActive = ts
      }
      for (const r of a.data ?? []) seen(r.crew_id as string, r.user_id as string, r.updated_at as string)
      for (const r of p.data ?? []) seen(r.crew_id as string, r.user_id as string, r.created_at as string)
      for (const [id, set] of Object.entries(people)) get(id).active = set.size
      setCounts(out)
    }
    void load()
    const id = setInterval(load, 30000)
    return () => { alive = false; clearInterval(id) }
  }, [])
  return counts
}

// ---------------- crew feed ----------------
export async function createPostCloud(p: { crewId: string; userId: string; name: string; kind: PostKind; text: string; imagePaths?: string[]; meta?: Record<string, unknown> }) {
  const { error } = await withRequestTimeout((signal) => supabase!.from('crew_posts').insert({ crew_id: p.crewId, user_id: p.userId, name: p.name, kind: p.kind, text: p.text, image_path: p.imagePaths?.[0] ?? null, image_paths: p.imagePaths ?? [], meta: p.meta ?? {} }).abortSignal(signal), 30000, 'Saving post')
  return error?.message ?? null
}
export async function deletePostCloud(id: string) {
  if (!supabase) return
  const { data, error } = await withTimeout(supabase.from('crew_posts').select('id,image_paths,image_path').eq('id', id), 15000, 'Loading post')
  if (error) throw new Error(error.message)
  await removePostRows(data ?? [])
}
export async function deleteMyPostsCloud(crewId: string, userId: string) {
  if (!supabase) return
  const { data, error } = await withTimeout(supabase.from('crew_posts').select('id,image_paths,image_path').eq('crew_id', crewId).eq('user_id', userId), 15000, 'Loading posts')
  if (error) throw new Error(error.message)
  await removePostRows(data ?? [])
}
async function removePostRows(rows: { id: number; image_paths: string[]; image_path: string | null }[]) {
  if (!supabase || !rows.length) return
  const paths = rows.flatMap((r) => postPhotos({ id: String(r.id), imagePaths: r.image_paths, imagePath: r.image_path ?? undefined }).map((p) => p.id))
  if (paths.length) {
    const { error } = await withTimeout(supabase.storage.from(CREW_BUCKET).remove(paths), 30000, 'Deleting photos')
    if (error) throw new Error(error.message)
  }
  const { error } = await withTimeout(supabase.from('crew_posts').delete().in('id', rows.map((r) => r.id)), 15000, 'Deleting posts')
  if (error) throw new Error(error.message)
}
export async function toggleLikeCloud(postId: string, userId: string, liked: boolean) {
  if (liked) await supabase?.from('crew_post_likes').delete().eq('post_id', postId).eq('user_id', userId)
  else await supabase?.from('crew_post_likes').insert({ post_id: postId, user_id: userId })
}

/** The feed for one crew (newest first). Null when the backend isn't configured. */
export function useCrewFeed(crewId: string | null, userId: string | null) {
  const [posts, setPosts] = useState<CrewPost[]>([])
  const [tick, setTick] = useState(0)
  const refresh = useCallback(() => setTick((t) => t + 1), [])
  useEffect(() => {
    if (!supabase || !crewId) return
    let alive = true
    const load = async () => {
      const { data: rows } = await supabase.from('crew_posts').select('id,user_id,name,kind,text,image_path,image_paths,meta,created_at').eq('crew_id', crewId).order('created_at', { ascending: false }).limit(40)
      const ids = (rows ?? []).map((r) => r.id as number)
      const { data: likes } = ids.length ? await supabase.from('crew_post_likes').select('post_id,user_id').in('post_id', ids) : { data: [] as { post_id: number; user_id: string }[] }
      if (!alive) return
      setPosts((rows ?? []).map((r) => {
        const l = (likes ?? []).filter((x) => x.post_id === r.id)
        return {
          id: String(r.id), crewId, userId: r.user_id as string, name: r.name as string, kind: r.kind as PostKind, text: r.text as string,
          imagePaths: r.image_paths?.length ? r.image_paths as string[] : r.image_path ? [r.image_path as string] : [],
          imagePath: (r.image_path as string | null) ?? undefined, meta: (r.meta as Record<string, unknown>) ?? {}, ts: Date.parse(r.created_at as string),
          mine: r.user_id === userId, likes: l.length, liked: l.some((x) => x.user_id === userId),
        }
      }))
    }
    void load()
    const id = setInterval(load, 15000)
    return () => { alive = false; clearInterval(id) }
  }, [crewId, userId, tick])
  return supabase ? { posts, refresh } : null
}

// ---------------- challenges ----------------
export interface ChallengeRow { userId: string; name: string; score: number }
export async function pushScore(cohort: string, userId: string, name: string, score: number) {
  await supabase?.from('challenge_scores').upsert({ cohort, user_id: userId, name, score, updated_at: new Date().toISOString() })
}
export async function createChallengeCloud(cc: CustomChallenge, userId: string, isPublic: boolean): Promise<string | null> {
  if (!supabase) return null
  const { error } = await supabase.from('custom_challenges').insert({ id: cc.id, creator: userId, name: cc.name, emoji: cc.emoji, metric: cc.metric, unit: cc.unit, start_date: cc.start, end_date: cc.end, is_public: isPublic })
  return error ? error.message : null
}
const toCC = (r: Record<string, unknown>): CustomChallenge => ({ id: r.id as string, name: r.name as string, emoji: r.emoji as string, metric: r.metric as CustomChallenge['metric'], unit: r.unit as string, start: r.start_date as string, end: r.end_date as string })
export async function fetchPublicChallenges(today: string): Promise<CustomChallenge[]> {
  if (!supabase) return []
  const { data } = await supabase.from('custom_challenges').select('*').eq('is_public', true).gte('end_date', today).order('start_date').limit(30)
  return (data ?? []).map(toCC)
}
export async function fetchChallengeById(id: string): Promise<CustomChallenge | null> {
  if (!supabase) return null
  const { data } = await supabase.from('custom_challenges').select('*').eq('id', id).maybeSingle()
  return data ? toCC(data) : null
}
export async function leaveChallengeCloud(cohort: string, userId: string) {
  await supabase?.from('challenge_scores').delete().eq('cohort', cohort).eq('user_id', userId)
}
export function useLeaderboard(cohort: string | null, userId: string | null) {
  const [rows, setRows] = useState<(ChallengeRow & { mine: boolean })[]>([])
  useEffect(() => {
    if (!supabase || !cohort) return
    let alive = true
    const load = async () => {
      const { data } = await supabase.from('challenge_scores').select('user_id,name,score').eq('cohort', cohort).order('score', { ascending: false }).limit(25)
      if (alive) setRows((data ?? []).map((r) => ({ userId: r.user_id as string, name: (r.name as string).split(' ')[0], score: Number(r.score), mine: r.user_id === userId })))
    }
    void load()
    const id = setInterval(load, 20000)
    return () => { alive = false; clearInterval(id) }
  }, [cohort, userId])
  return rows
}

// ---------------- friends ----------------
export interface PublicProfile { userId: string; handle: string; name: string; avatar?: string | null }
type Card = { user_id: string; handle: string; name: string; avatar_url?: string | null }
/** Profile cards, with the photo when the avatar column exists (older databases fall back without it). */
async function cardQuery(apply: (q: any) => PromiseLike<{ data: unknown; error: unknown }>): Promise<Card[]> { // eslint-disable-line @typescript-eslint/no-explicit-any
  for (const cols of ['user_id,handle,name,avatar_url', 'user_id,handle,name']) {
    const { data, error } = await apply(supabase!.from('public_profiles').select(cols))
    if (!error) return (data ?? []) as Card[]
  }
  return []
}
const toPublic = (r: Card): PublicProfile => ({ userId: r.user_id, handle: r.handle, name: r.name, avatar: r.avatar_url ?? null })
export const sha256 = async (text: string) => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text.trim().toLowerCase()))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}
export async function saveMyDiscovery(userId: string, p: { handle: string; name: string; findByHandle: boolean; findByEmail: boolean; email: string | null }) {
  const email_hash = p.findByEmail && p.email ? await sha256(p.email) : null
  const { error } = await supabase!.from('public_profiles').upsert({ user_id: userId, handle: p.handle.toLowerCase(), name: p.name, discoverable_handle: p.findByHandle, discoverable_email: p.findByEmail, email_hash, updated_at: new Date().toISOString() })
  return error ? (error.code === '23505' ? 'That handle is taken. Try another.' : error.message) : null
}
/** Everyone gets a profile card with a handle so friends can follow them and open their profile. Never makes them searchable: that stays an opt-in. */
export async function ensureProfileCard(userId: string, name: string, avatar?: string | null): Promise<string | null> {
  if (!supabase) return null
  const have = (await cardQuery((c) => c.eq('user_id', userId)))[0]
  if (have?.handle) {
    // keep the Google photo current; ignore failures (older databases have no avatar column)
    if (avatar && have.avatar_url !== avatar) void Promise.resolve(supabase.from('public_profiles').update({ avatar_url: avatar }).eq('user_id', userId)).catch(() => {})
    return have.handle
  }
  const base = (name || 'lifter').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 14) || 'lifter'
  for (let i = 0; i < 4; i++) {
    const handle = `${base}${Math.floor(100 + Math.random() * 9000)}`
    const row = { user_id: userId, handle, name: name || 'Member', discoverable_handle: false, discoverable_email: false }
    let { error } = await supabase.from('public_profiles').insert((avatar ? { ...row, avatar_url: avatar } : row) as never)
    if (error && avatar && error.code !== '23505') ({ error } = await supabase.from('public_profiles').insert(row))
    if (!error) return handle
    if (error.code !== '23505') return null
    const again = (await cardQuery((c) => c.eq('user_id', userId)))[0]
    if (again?.handle) return again.handle
  }
  return null
}
export async function findByHandle(q: string): Promise<PublicProfile[]> {
  const term = q.toLowerCase().replace(/[^a-z0-9_ ]/g, '').trim()
  if (term.length < 2) return []
  const rows = await cardQuery((c) => c.eq('discoverable_handle', true).or(`handle.ilike.${term.replace(/ /g, '_')}%,name.ilike.${term}%`).limit(10))
  return rows.map(toPublic)
}
export async function findByEmails(emails: string[]): Promise<PublicProfile[]> {
  const hashes = await Promise.all(emails.map(sha256))
  const rows = await cardQuery((c) => c.eq('discoverable_email', true).in('email_hash', hashes).limit(50))
  return rows.map(toPublic)
}
export async function followCloud(userId: string, friendId: string) { await supabase?.from('follows').upsert({ user_id: userId, friend_id: friendId }) }
export async function unfollowCloud(userId: string, friendId: string) { await supabase?.from('follows').delete().eq('user_id', userId).eq('friend_id', friendId) }
/** A person you can follow: from a crew you share, a search, or the people who already follow you. */
export interface Person { userId: string; name: string; handle: string | null; avatar: string | null; crews: string[]; streak: number; iFollow: boolean; followsMe: boolean }

const asPerson = (id: string, profs: Card[], mem: { user_id: string; crew_id: string; name: string; streak: number }[], iFollow: Set<string>, followsMe: Set<string>): Person => {
  const prof = profs.find((r) => r.user_id === id)
  const mine = mem.filter((m) => m.user_id === id)
  return {
    userId: id, name: prof?.name ?? mine[0]?.name ?? 'Member', handle: prof?.handle ?? null, avatar: prof?.avatar_url ?? null,
    crews: mine.map((m) => m.crew_id), streak: mine.reduce((a, m) => Math.max(a, m.streak ?? 0), 0), iFollow: iFollow.has(id), followsMe: followsMe.has(id),
  }
}

/** Everyone connected to you, plus people in your crews you could follow. */
export async function fetchConnections(userId: string, joined: string[]): Promise<{ friends: Person[]; following: Person[]; followers: Person[]; suggestions: Person[] }> {
  const [{ data: out }, { data: inn }, { data: crewRows }] = await Promise.all([
    supabase!.from('follows').select('friend_id').eq('user_id', userId),
    supabase!.from('follows').select('user_id').eq('friend_id', userId),
    joined.length ? supabase!.from('crew_members').select('user_id').in('crew_id', joined) : Promise.resolve({ data: [] as { user_id: string }[] }),
  ])
  const iFollow = new Set((out ?? []).map((r) => r.friend_id as string))
  const followsMe = new Set((inn ?? []).map((r) => r.user_id as string))
  const mates = new Set((crewRows ?? []).map((r) => r.user_id as string).filter((id) => id !== userId))
  const ids = [...new Set([...iFollow, ...followsMe, ...mates])]
  if (!ids.length) return { friends: [], following: [], followers: [], suggestions: [] }
  const [profs, { data: mem }] = await Promise.all([
    cardQuery((c) => c.in('user_id', ids)),
    supabase!.from('crew_members').select('user_id,crew_id,name,streak').in('user_id', ids),
  ])
  const all = ids.map((id) => asPerson(id, profs, (mem ?? []) as never, iFollow, followsMe))
  return {
    friends: all.filter((p) => p.iFollow && p.followsMe),
    following: all.filter((p) => p.iFollow && !p.followsMe),
    followers: all.filter((p) => !p.iFollow && p.followsMe),
    suggestions: all.filter((p) => !p.iFollow && !p.followsMe && mates.has(p.userId)).slice(0, 20),
  }
}

export async function fetchPerson(userId: string, id: string): Promise<Person | null> {
  const [{ data: out }, { data: inn }, profs, { data: mem }] = await Promise.all([
    supabase!.from('follows').select('friend_id').eq('user_id', userId).eq('friend_id', id),
    supabase!.from('follows').select('user_id').eq('user_id', id).eq('friend_id', userId),
    cardQuery((c) => c.eq('user_id', id)),
    supabase!.from('crew_members').select('user_id,crew_id,name,streak').eq('user_id', id),
  ])
  if (!profs.length && !(mem ?? []).length) return null
  return asPerson(id, profs, (mem ?? []) as never, new Set((out ?? []).map((r) => r.friend_id as string)), new Set((inn ?? []).map((r) => r.user_id as string)))
}
export async function handleToUser(handle: string): Promise<string | null> {
  const { data } = await supabase!.from('public_profiles').select('user_id').eq('handle', handle.toLowerCase()).maybeSingle()
  return (data?.user_id as string) ?? null
}
