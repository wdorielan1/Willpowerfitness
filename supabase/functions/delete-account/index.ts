// Supabase Edge Function: deletes the signed-in person's account, for good.
//
// What it does, in this order (nothing is deleted until everything before it worked, so a failed run can simply be run again):
//   1. Works out who is asking from their own sign-in token. It never trusts an id sent in the request, so nobody can delete
//      someone else.
//   2. Crews they started: if other people are in one, it passes to the longest-standing member so it keeps going; if they
//      were the only one in it, it goes with them.
//   3. Removes their files from Storage through the Storage API (deleting storage rows with SQL leaves the files behind, still
//      costing money): progress photos, and their photos and videos in every crew they were in.
//   4. Deletes the sign-in account. Every table that holds their data (profile, workouts, posts, comments, likes, follows,
//      notifications, challenges, handle and so on) is tied to it and goes with it.
//
// It is one self-contained file so it can be pasted straight into the dashboard's function editor. It needs no keys of its own:
// Supabase gives every function the project's address and service key. Keep "Verify JWT" ON for this function.

const PROGRESS = 'progress-photos'
const CREW = 'crew-photos'
const PAGE = 100

type Fail = { message: string } | null
interface Entry { name: string; id: string | null } // a folder has no id
export interface Admin {
  // deno-lint-ignore no-explicit-any
  from(table: string): any
  storage: { from(bucket: string): {
    list(path: string, opts: { limit: number; offset: number }): Promise<{ data: Entry[] | null; error: Fail }>
    remove(paths: string[]): Promise<{ error: Fail }>
  } }
  auth: {
    getUser(jwt: string): Promise<{ data: { user: { id: string } | null }; error: Fail }>
    admin: { deleteUser(id: string): Promise<{ error: Fail }> }
  }
}
export interface Outcome { status: number; body: Record<string, unknown> }

const fail = (status: number, message: string): Outcome => ({ status, body: { error: message } })

/** Every file under `prefix`, folders included. */
async function listAll(admin: Admin, bucket: string, prefix: string, depth = 0): Promise<{ paths: string[]; error?: string }> {
  const paths: string[] = []
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: PAGE, offset })
    if (error) return { paths, error: error.message }
    const entries = data ?? []
    for (const e of entries) {
      if (e.id === null && depth < 4) { // a folder: go in
        const inner = await listAll(admin, bucket, `${prefix}/${e.name}`, depth + 1)
        if (inner.error) return inner
        paths.push(...inner.paths)
      } else if (e.id !== null) paths.push(`${prefix}/${e.name}`)
    }
    if (entries.length < PAGE) break
  }
  return { paths }
}

async function removeAll(admin: Admin, bucket: string, paths: string[]): Promise<string | null> {
  for (let i = 0; i < paths.length; i += PAGE) {
    const { error } = await admin.storage.from(bucket).remove(paths.slice(i, i + PAGE))
    if (error) return error.message
  }
  return null
}

export async function deleteAccount(admin: Admin, jwt: string | null): Promise<Outcome> {
  if (!jwt) return fail(401, 'Sign in first.')
  const { data: who, error: whoError } = await admin.auth.getUser(jwt)
  const uid = who?.user?.id
  if (whoError || !uid) return fail(401, 'Sign in first.')

  // 2. crews they started
  const mine = await admin.from('crews').select('id').eq('created_by', uid)
  if (mine.error) return fail(500, mine.error.message)
  const alone: string[] = []
  for (const { id } of (mine.data ?? []) as { id: string }[]) {
    const next = await admin.from('crew_members').select('user_id').eq('crew_id', id).neq('user_id', uid).order('joined_at', { ascending: true }).limit(1)
    if (next.error) return fail(500, next.error.message)
    const heir = (next.data ?? [])[0]?.user_id as string | undefined
    if (!heir) { alone.push(id); continue }
    const moved = await admin.from('crews').update({ created_by: heir }).eq('id', id)
    if (moved.error) return fail(500, moved.error.message)
  }

  // 3. their files
  const inCrews = await admin.from('crew_members').select('crew_id').eq('user_id', uid)
  const posted = await admin.from('crew_posts').select('crew_id').eq('user_id', uid)
  if (inCrews.error || posted.error) return fail(500, (inCrews.error ?? posted.error).message)
  const crewIds = [...new Set([...(inCrews.data ?? []), ...(posted.data ?? [])].map((r: { crew_id: string }) => r.crew_id))]
  const progress = await listAll(admin, PROGRESS, uid)
  if (progress.error) return fail(500, progress.error)
  const crew: string[] = []
  for (const id of crewIds) {
    const files = await listAll(admin, CREW, alone.includes(id) ? id : `${id}/${uid}`) // a crew that goes with them takes all its files too
    if (files.error) return fail(500, files.error)
    crew.push(...files.paths)
  }
  for (const id of alone.filter((a) => !crewIds.includes(a))) { // a crew they started but never joined or posted in
    const files = await listAll(admin, CREW, id)
    if (files.error) return fail(500, files.error)
    crew.push(...files.paths)
  }
  const gone = (await removeAll(admin, PROGRESS, progress.paths)) ?? (await removeAll(admin, CREW, crew))
  if (gone) return fail(500, gone)

  // 4. the account itself, and with it every row that holds their data
  const { error } = await admin.auth.admin.deleteUser(uid)
  if (error) return fail(500, error.message)
  return { status: 200, body: { ok: true, files: progress.paths.length + crew.length } }
}

const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type', 'access-control-allow-methods': 'POST, OPTIONS' }
const reply = (o: Outcome) => new Response(JSON.stringify(o.body), { status: o.status, headers: { ...cors, 'content-type': 'application/json' } })

// Deno is only there when this runs as a Supabase function (the tests import deleteAccount on its own)
type DenoRuntime = { env: { get(name: string): string | undefined }; serve(handler: (req: Request) => Promise<Response>): void }
const runtime = (globalThis as unknown as { Deno?: DenoRuntime }).Deno
if (runtime) {
  runtime.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    if (req.method !== 'POST') return reply(fail(405, 'Use POST.'))
    const url = runtime.env.get('SUPABASE_URL')
    const key = runtime.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!url || !key) return reply(fail(500, 'Missing project settings'))
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    const admin = createClient(url, key, { auth: { persistSession: false } })
    const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '') || null
    return reply(await deleteAccount(admin as unknown as Admin, jwt))
  })
}
