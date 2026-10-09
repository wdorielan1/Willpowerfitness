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
export async function compress(src: Blob, max = 1280): Promise<Blob> {
  const bmp = await createImageBitmap(src)
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * scale)
  c.height = Math.round(bmp.height * scale)
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('compress failed'))), 'image/jpeg', 0.82))
}

export interface SaveResult { path?: string; where: 'cloud' | 'device'; error?: string }

export async function savePhotoBlob(id: string, blob: Blob, userId: string | null, bucket = BUCKET, folder = userId ?? ''): Promise<SaveResult> {
  if (supabase && userId) {
    const path = `${folder}/${id}.jpg`
    const { error } = await supabase.storage.from(bucket).upload(path, blob, { contentType: 'image/jpeg', upsert: true })
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
