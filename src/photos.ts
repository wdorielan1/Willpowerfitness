import { useEffect, useState } from 'react'
import { supabase } from './cloud'
import type { Photo } from './types'

const BUCKET = 'progress-photos'
export const CREW_BUCKET = 'crew-photos'
const DB = 'wpf-photos'

// ---------- on-device storage (fallback when the cloud bucket isn't available) ----------
function openDB(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1)
    r.onupgradeneeded = () => r.result.createObjectStore('p')
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  })
}
async function idb<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDB()
  return new Promise((res, rej) => {
    const req = fn(db.transaction('p', mode).objectStore('p'))
    req.onsuccess = () => res(req.result)
    req.onerror = () => rej(req.error)
  })
}

/** Shrink a photo to ~1280px JPEG so uploads stay small and fast. */
export function withTimeout<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  return new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error(`${what} timed out. Check your connection and try again.`)), ms)
    p.then((v) => { clearTimeout(t); res(v) }, (e) => { clearTimeout(t); rej(e) })
  })
}

const loadImg = (src: Blob) => new Promise<HTMLImageElement>((res, rej) => {
  const url = URL.createObjectURL(src); const img = new Image()
  img.onload = () => { URL.revokeObjectURL(url); res(img) }
  img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Could not read that photo')) }
  img.src = url
})

export async function compress(src: Blob, max = 1280): Promise<Blob> {
  let source: CanvasImageSource, w: number, h: number
  try { const bmp = await createImageBitmap(src, { imageOrientation: 'from-image' }); source = bmp; w = bmp.width; h = bmp.height }
  catch { const img = await withTimeout(loadImg(src), 15000, 'Reading the photo'); source = img; w = img.naturalWidth; h = img.naturalHeight }
  const scale = Math.min(1, max / Math.max(w, h))
  const c = document.createElement('canvas')
  c.width = Math.round(w * scale)
  c.height = Math.round(h * scale)
  c.getContext('2d')!.drawImage(source, 0, 0, c.width, c.height)
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Could not shrink that photo'))), 'image/jpeg', 0.82))
}

export interface SaveResult { path?: string; where: 'cloud' | 'device'; error?: string }

export async function savePhotoBlob(id: string, blob: Blob, userId: string | null, bucket = BUCKET, folder = userId ?? ''): Promise<SaveResult> {
  if (supabase && userId) {
    const path = `${folder}/${id}.jpg`
    let error: { message: string } | null = null
    try { error = (await withTimeout(supabase.storage.from(bucket).upload(path, blob, { contentType: 'image/jpeg', upsert: true }), 30000, 'Photo upload')).error } catch (e) { error = { message: (e as Error).message } }
    if (!error) return { path, where: 'cloud' }
    console.warn('photo upload failed, keeping on device:', error.message)
    await idb('readwrite', (s) => s.put(blob, id))
    return { where: 'device', error: error.message }
  }
  await idb('readwrite', (s) => s.put(blob, id))
  return { where: 'device' }
}

export async function deletePhotoBlob(p: { id: string; path?: string }, bucket = BUCKET) {
  if (p.path && supabase) await supabase.storage.from(bucket).remove([p.path])
  try { await idb('readwrite', (s) => s.delete(p.id)) } catch { /* nothing stored locally */ }
}

/** Resolve displayable URLs for a list of photos. */
export function usePhotoUrls(photos: { id: string; path?: string }[], bucket = BUCKET) {
  const [urls, setUrls] = useState<Record<string, string>>({})
  const key = photos.map((p) => p.id + (p.path ?? '')).join('|')
  useEffect(() => {
    let alive = true
    const made: string[] = []
    ;(async () => {
      const out: Record<string, string> = {}
      const cloud = photos.filter((p) => p.path)
      if (cloud.length && supabase) {
        const { data } = await supabase.storage.from(bucket).createSignedUrls(cloud.map((p) => p.path!), 3600)
        data?.forEach((d, i) => { if (d.signedUrl) out[cloud[i].id] = d.signedUrl })
      }
      for (const p of photos.filter((x) => !x.path)) {
        try {
          const b = await idb<Blob | undefined>('readonly', (s) => s.get(p.id))
          if (b) { const u = URL.createObjectURL(b); made.push(u); out[p.id] = u }
        } catch { /* ignore */ }
      }
      if (alive) setUrls(out)
    })()
    return () => { alive = false; made.forEach(URL.revokeObjectURL) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return urls
}
