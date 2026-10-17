// Supabase Edge Function: deletes crew videos once they are 60 days old. The post, its text and its cover photo stay;
// only the clip goes. Schedule it once a day (see docs/TODO.md). It is one self-contained file so it can be pasted straight
// into the dashboard's function editor. It runs with the project's own service key, which Supabase provides to every
// function automatically, so there is nothing to paste or set.
//
// Files must be removed through Supabase's Storage API (deleting the storage.objects row with SQL leaves the file
// behind, still costing storage), which is why this is a small function instead of a database job.

export const KEEP_DAYS = 60
export const BUCKET = 'crew-photos'
const PAGE = 500

interface Meta { video?: { path?: string; [k: string]: unknown }; [k: string]: unknown }
interface Row { id: number; meta: Meta | null }
type Fail = { message: string } | null
/** The few parts of the Supabase client this uses, so it can be tested with a stand-in. */
export interface Db {
  // deno-lint-ignore no-explicit-any
  from(table: string): any
  storage: { from(bucket: string): { remove(paths: string[]): Promise<{ error: Fail }> } }
}
export interface Result { checked: number; removed: number; marked: number; error?: string }

export async function expireVideos(db: Db, now = Date.now(), keepDays = KEEP_DAYS): Promise<Result> {
  const cutoff = new Date(now - keepDays * 86400000).toISOString()
  const out: Result = { checked: 0, removed: 0, marked: 0 }
  let lastId = 0
  for (;;) {
    // plain filters only, paged by id, so a growing pile of already-expired posts never crowds out newer ones
    const { data, error } = await db.from('crew_posts').select('id, meta').eq('kind', 'video').lt('created_at', cutoff).gt('id', lastId).order('id', { ascending: true }).limit(PAGE)
    if (error) return { ...out, error: error.message }
    const rows = (data ?? []) as Row[]
    if (!rows.length) break
    lastId = rows[rows.length - 1].id
    out.checked += rows.length
    const todo = rows.filter((r) => r.meta?.video?.path)
    if (todo.length) {
      const { error: removeError } = await db.storage.from(BUCKET).remove(todo.map((r) => r.meta!.video!.path as string))
      if (removeError) return { ...out, error: removeError.message } // leave the rows alone so the next run tries again
      out.removed += todo.length
      for (const r of todo) {
        const { path: _gone, ...rest } = r.meta!.video!
        void _gone
        const { error: updateError } = await db.from('crew_posts').update({ meta: { ...r.meta, video: { ...rest, expired: true } } }).eq('id', r.id)
        if (updateError) return { ...out, error: updateError.message }
        out.marked++
      }
    }
    if (rows.length < PAGE) break
  }
  return out
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

// Deno is only there when this runs as a Supabase function (the tests import expireVideos on its own)
type DenoRuntime = { env: { get(name: string): string | undefined }; serve(handler: () => Promise<Response>): void }
const runtime = (globalThis as unknown as { Deno?: DenoRuntime }).Deno
if (runtime) {
  runtime.serve(async () => {
    const url = runtime.env.get('SUPABASE_URL')
    const key = runtime.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!url || !key) return json({ error: 'Missing project settings' }, 500)
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    const db = createClient(url, key, { auth: { persistSession: false } })
    const result = await expireVideos(db as unknown as Db)
    return json(result, result.error ? 500 : 200)
  })
}
